import type Stripe from "stripe";
import { env } from "@/env.js";
import type { SubscriptionRepository } from "../domain/subscription-repository.js";
import type { WalletRepository } from "../domain/wallet-repository.js";
import type { LedgerRepository } from "../domain/ledger-repository.js";
import { Subscription } from "../domain/subscription.js";
import type { SubscriptionStatus } from "../domain/subscription.js";
import { CreditWallet } from "../domain/credit-wallet.js";
import { LedgerEntry } from "../domain/ledger-entry.js";
import { getPlan } from "../domain/plan.js";
import {
  getTopup,
  isTopupId,
  TOPUP_VALIDITY_DAYS,
} from "../domain/topup.js";
import { stripePriceIdToPlan } from "../infrastructure/stripe/plan-price-mapping.js";
import { markEventProcessed } from "../infrastructure/webhook-idempotency.js";
import type { BillingMailer } from "./billing-mailer.js";

interface Deps {
  subscriptions: SubscriptionRepository;
  wallets: WalletRepository;
  ledger: LedgerRepository;
  mailer: BillingMailer;
}

/**
 * Roteador de webhooks Stripe — cada event.type vai pro handler correspondente.
 * Tudo idempotente via markEventProcessed.
 *
 * Eventos relevantes:
 * - customer.subscription.created: cria nossa Subscription
 * - customer.subscription.updated: plan change, cancel_at_period_end, past_due
 * - customer.subscription.deleted: fim definitivo
 * - invoice.payment_succeeded: renewal OK → zera wallet + credita novo ciclo
 * - invoice.payment_failed: apenas logs (Stripe retenta sozinho)
 *
 * O evento checkout.session.completed NÃO aciona a criação da subscription —
 * a gente reage em customer.subscription.created pra não depender da ordem
 * dos webhooks. Ambos chegam.
 */
export class HandleStripeWebhookUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(event: Stripe.Event): Promise<void> {
    const { isNew } = await markEventProcessed({
      provider: "stripe",
      eventKey: event.id,
      eventType: event.type,
    });
    if (!isNew) return;

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
        await this.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "invoice.payment_failed":
        // Stripe retenta sozinho; a Subscription vira past_due via
        // customer.subscription.updated. A gente só dispara email pro user
        // atualizar o cartão.
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "checkout.session.completed":
        // Relevante APENAS pra mode=payment (top-ups). Subscription tem
        // fluxo próprio via customer.subscription.created/updated.
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      default:
        // Outros eventos são silenciosamente ignorados — Stripe manda muita
        // coisa que não afeta nosso estado.
        break;
    }
  }

  // ───── handlers ──────────────────────────────────────────────

  private async handleSubscriptionUpsert(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const ownerId = stripeSub.metadata?.ownerId;
    if (!ownerId) {
      console.error(
        "[billing] subscription sem ownerId no metadata — ignorando",
        stripeSub.id,
      );
      return;
    }
    const priceId = stripeSub.items.data[0]?.price.id;
    if (!priceId) {
      console.error("[billing] subscription sem price", stripeSub.id);
      return;
    }
    const planId = stripePriceIdToPlan(priceId);
    if (!planId) {
      console.error("[billing] price id desconhecido", priceId);
      return;
    }

    const existing = await this.deps.subscriptions.findByStripeSubscriptionId(
      stripeSub.id,
    );
    const status = mapStripeStatus(stripeSub.status);
    const currentPeriodStart = periodStart(stripeSub);
    const currentPeriodEnd = periodEnd(stripeSub);
    const canceledAt = stripeSub.canceled_at
      ? new Date(stripeSub.canceled_at * 1000)
      : null;
    const cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end);

    if (existing) {
      existing.updateFromStripe({
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        canceledAt,
      });
      await this.deps.subscriptions.save(existing);
    } else {
      const created = Subscription.create({
        id: this.deps.subscriptions.nextId(),
        ownerId,
        planId,
        status,
        stripeSubscriptionId: stripeSub.id,
        stripeCustomerId: asCustomerId(stripeSub.customer),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      });
      await this.deps.subscriptions.save(created);
    }
  }

  private async handleSubscriptionDeleted(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const existing = await this.deps.subscriptions.findByStripeSubscriptionId(
      stripeSub.id,
    );
    if (!existing) return;
    const priceId = stripeSub.items.data[0]?.price.id;
    const planId =
      (priceId ? stripePriceIdToPlan(priceId) : null) ?? existing.planId;
    existing.updateFromStripe({
      planId,
      status: "canceled",
      currentPeriodStart: existing.currentPeriodStart,
      currentPeriodEnd: periodEnd(stripeSub) ?? existing.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: new Date(),
    });
    await this.deps.subscriptions.save(existing);
    // Não expira a wallet manualmente — expiresAt já vai passar naturalmente
    // e findActiveByOwner ignora expiradas.
  }

  /**
   * Dispara email pro user atualizar o método de pagamento. A assinatura
   * continua ativa durante o ciclo de retries do Stripe; se todas falharem,
   * o Stripe manda customer.subscription.updated com status=past_due/unpaid,
   * que já tratamos no handleSubscriptionUpsert.
   */
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const customerEmail = invoice.customer_email;
    if (!customerEmail) {
      console.warn(
        "[billing] invoice.payment_failed sem customer_email",
        invoice.id,
      );
      return;
    }

    const subscriptionId = getSubscriptionFromInvoice(invoice);
    let planName: string | null = null;
    let portalUrl: string | null = null;
    if (subscriptionId) {
      const sub = await this.deps.subscriptions.findByStripeSubscriptionId(
        subscriptionId,
      );
      if (sub) {
        planName = getPlan(sub.planId).name;
        portalUrl = `${env.WEB_ORIGIN}/app/billing`;
      }
    }

    try {
      await this.deps.mailer.sendPaymentFailed({
        to: customerEmail,
        customerName: invoice.customer_name ?? null,
        planName,
        portalUrl,
      });
    } catch (err) {
      console.error(
        "[billing] falha ao enviar email de pagamento falhou",
        err,
      );
    }
  }

  /**
   * Fluxo crítico: cada renewal bem-sucedido zera a wallet da assinatura e
   * credita o valor do plano. Primeira invoice (após checkout) cria a wallet;
   * as seguintes substituem.
   *
   * "Zerar + depositar" é feito como: fecha a wallet antiga com ledger de
   * expiração do saldo sobrando (pra auditoria), cria wallet nova com os
   * créditos do ciclo.
   */
  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = getSubscriptionFromInvoice(invoice);
    if (!subscriptionId) return;

    const sub = await this.deps.subscriptions.findByStripeSubscriptionId(
      subscriptionId,
    );
    if (!sub) {
      // Subscription ainda não foi criada pela gente (ordem dos webhooks).
      // Stripe vai retentar esse invoice se a gente devolver 500, mas aqui
      // retornamos OK pra não ficar em loop — o próximo webhook fará essa
      // renewal na próxima renovação (ou primeiro invoice via fallback).
      // Em prod, a criação da sub sempre chega antes do payment_succeeded.
      console.warn(
        "[billing] invoice.payment_succeeded sem subscription local:",
        subscriptionId,
      );
      return;
    }

    const plan = getPlan(sub.planId);

    // Fecha carteiras antigas da assinatura, registrando expiração do saldo
    // remanescente pra auditoria.
    const existing = await this.deps.wallets.findByOwnerAndSource(
      sub.ownerId,
      "subscription",
    );
    for (const wallet of existing) {
      if (wallet.balance > 0) {
        const expEntry = LedgerEntry.create({
          id: this.deps.ledger.nextId(),
          ownerId: sub.ownerId,
          walletId: wallet.id,
          walletSource: wallet.source,
          type: "debit",
          amount: wallet.balance,
          reason: "expiration",
          metadata: { subscriptionId: sub.id.toString(), reason: "cycle_reset" },
        });
        await this.deps.ledger.save(expEntry);
      }
      // Mesmo com balance 0, mata a wallet pra não acumular docs obsoletos.
      const closed = CreditWallet.restore({
        id: wallet.id,
        scope: wallet.scope,
        ownerId: wallet.ownerId,
        source: wallet.source,
        balance: 0,
        expiresAt: new Date(), // já expirada
        externalRef: wallet.externalRef,
        createdAt: wallet.createdAt,
        updatedAt: new Date(),
      });
      await this.deps.wallets.save(closed);
    }

    // Cria nova wallet do ciclo com os créditos do plano.
    const wallet = CreditWallet.create({
      id: this.deps.wallets.nextId(),
      ownerId: sub.ownerId,
      source: "subscription",
      initialBalance: plan.creditsPerCycle,
      expiresAt: sub.currentPeriodEnd,
      externalRef: sub.stripeSubscriptionId,
    });
    await this.deps.wallets.save(wallet);

    const creditEntry = LedgerEntry.create({
      id: this.deps.ledger.nextId(),
      ownerId: sub.ownerId,
      walletId: wallet.id,
      walletSource: wallet.source,
      type: "credit",
      amount: plan.creditsPerCycle,
      reason: "subscription_renewal",
      metadata: {
        planId: sub.planId,
        invoiceId: invoice.id,
        periodEnd: sub.currentPeriodEnd.toISOString(),
      },
    });
    await this.deps.ledger.save(creditEntry);
  }

  /**
   * Pagamento único (top-up) completou. Só reage quando:
   * - mode === "payment" (subscription tem fluxo separado)
   * - metadata.type === "topup"
   * - status === "complete" e payment_status === "paid"
   *
   * Cria wallet source=topup com expiresAt = now + TOPUP_VALIDITY_DAYS.
   * Idempotência vem via markEventProcessed no topo do execute().
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (session.mode !== "payment") return;
    if (session.metadata?.type !== "topup") return;
    if (session.payment_status !== "paid") {
      console.warn(
        "[billing] topup checkout completed sem payment=paid:",
        session.id,
      );
      return;
    }

    const ownerId = session.metadata.ownerId;
    const topupId = session.metadata.topupId;
    if (!ownerId || !topupId || !isTopupId(topupId)) {
      console.error(
        "[billing] top-up checkout com metadata inválida",
        session.id,
        session.metadata,
      );
      return;
    }

    const topup = getTopup(topupId);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + TOPUP_VALIDITY_DAYS);

    const wallet = CreditWallet.create({
      id: this.deps.wallets.nextId(),
      ownerId,
      source: "topup",
      initialBalance: topup.credits,
      expiresAt,
      externalRef: session.id, // permite reconciliar no Stripe depois
      now,
    });
    await this.deps.wallets.save(wallet);

    const entry = LedgerEntry.create({
      id: this.deps.ledger.nextId(),
      ownerId,
      walletId: wallet.id,
      walletSource: wallet.source,
      type: "credit",
      amount: topup.credits,
      reason: "topup_purchase",
      relatedAction: `topup_${topupId}`,
      metadata: {
        topupId,
        checkoutSessionId: session.id,
        priceCents: topup.priceCents,
        expiresAt: expiresAt.toISOString(),
      },
      now,
    });
    await this.deps.ledger.save(entry);

    // Recibo por email — best effort. Se falhar, não quebra o webhook
    // (os créditos já foram depositados).
    const customerEmail = session.customer_details?.email ?? session.customer_email;
    if (customerEmail) {
      try {
        await this.deps.mailer.sendTopupReceipt({
          to: customerEmail,
          customerName: session.customer_details?.name ?? null,
          creditsGranted: topup.credits,
          amountCents: topup.priceCents,
          receiptUrl: null, // Stripe hosted invoice — opcional buscar depois
          expiresAt,
        });
      } catch (err) {
        console.error("[billing] falha ao enviar recibo de topup", err);
      }
    }
  }
}

// ───── helpers ──────────────────────────────────────────────

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}

function asCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string {
  if (typeof customer === "string") return customer;
  return customer.id;
}

/**
 * Tipagens do Stripe SDK movem `current_period_*` ao longo de versões —
 * alguns builds colocam no root, outros no item. Acessamos via any pra
 * cobrir ambos sem afogar em types runtime-only.
 */
function periodStart(sub: Stripe.Subscription): Date {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts: number | undefined = (sub as any).current_period_start;
  if (ts) return new Date(ts * 1000);
  const item = sub.items.data[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemTs: number | undefined = (item as any)?.current_period_start;
  return itemTs ? new Date(itemTs * 1000) : new Date();
}

function periodEnd(sub: Stripe.Subscription): Date {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts: number | undefined = (sub as any).current_period_end;
  if (ts) return new Date(ts * 1000);
  const item = sub.items.data[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemTs: number | undefined = (item as any)?.current_period_end;
  return itemTs ? new Date(itemTs * 1000) : new Date();
}

/**
 * Stripe moveu `invoice.subscription` pro `invoice.parent.subscription_details`
 * na API 2025+ (dahlia/clover). Cobre múltiplos caminhos:
 * 1. invoice.parent.subscription_details.subscription  (novo padrão)
 * 2. invoice.subscription                              (legado)
 * 3. invoice.lines.data[].parent.subscription_item_details.subscription (fallback)
 */
function getSubscriptionFromInvoice(invoice: Stripe.Invoice): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyInvoice = invoice as any;

  // Caminho 1 — novo.
  const parent = anyInvoice.parent;
  if (parent?.type === "subscription_details") {
    const sub = parent.subscription_details?.subscription;
    const id = asId(sub);
    if (id) return id;
  }

  // Caminho 2 — legado.
  const id2 = asId(anyInvoice.subscription);
  if (id2) return id2;

  // Caminho 3 — fallback via linhas do invoice.
  const lines = anyInvoice.lines?.data;
  if (Array.isArray(lines)) {
    for (const line of lines) {
      // Pode vir direto na linha (legado).
      const direct = asId(line.subscription);
      if (direct) return direct;
      // Ou no parent da linha (novo).
      const lineParent = line.parent;
      if (lineParent?.type === "subscription_item_details") {
        const fromLine = asId(lineParent.subscription_item_details?.subscription);
        if (fromLine) return fromLine;
      }
    }
  }

  console.error(
    "[billing] não consegui extrair subscription do invoice",
    invoice.id,
    "parent:",
    JSON.stringify(parent ?? null),
    "linesCount:",
    lines?.length ?? 0,
  );
  return null;
}

function asId(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
}
