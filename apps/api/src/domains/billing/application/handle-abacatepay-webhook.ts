import type { WalletRepository } from "../domain/wallet-repository.js";
import type { LedgerRepository } from "../domain/ledger-repository.js";
import type { PixTopupIntentRepository } from "../domain/pix-topup-intent-repository.js";
import { CreditWallet } from "../domain/credit-wallet.js";
import { LedgerEntry } from "../domain/ledger-entry.js";
import { getTopup, TOPUP_VALIDITY_DAYS } from "../domain/topup.js";
import { markEventProcessed } from "../infrastructure/webhook-idempotency.js";
import type { AbacatePayEvent } from "../infrastructure/abacatepay/abacatepay-event-schema.js";
import type { BillingMailer } from "./billing-mailer.js";
import type {
  IssueInvoiceInput,
  IssueInvoiceUseCase,
} from "@/domains/invoicing/application/issue-invoice.js";

interface Deps {
  intents: PixTopupIntentRepository;
  wallets: WalletRepository;
  ledger: LedgerRepository;
  mailer: BillingMailer;
  /** Opcional — null quando NFE.io não está configurado. Best-effort. */
  issueInvoice?: IssueInvoiceUseCase | null;
}

/**
 * Processa webhook v2 da AbacatePay. O único evento relevante hoje é
 * `transparent.completed` — pagamento PIX confirmado, vira topup wallet.
 *
 * Idempotência: AbacatePay v2 não traz um `event.id` estável, então a
 * chave composta `transparent.completed:<charId>:<status>` faz o papel.
 * Isso impede dupla creditação se o mesmo webhook chegar 2x.
 *
 * Outros eventos (refund, dispute, subscription) caem no `default` e são
 * silenciosamente ignorados — quando precisarmos, adicionamos handler.
 */
export class HandleAbacatePayWebhookUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(event: AbacatePayEvent): Promise<void> {
    switch (event.event) {
      case "transparent.completed":
        await this.handleTransparentCompleted(event);
        break;

      default:
        // Eventos não tratados — log discreto, sem erro.
        console.log(
          "[billing/abacatepay] evento ignorado:",
          event.event,
        );
        break;
    }
  }

  private async handleTransparentCompleted(
    event: AbacatePayEvent,
  ): Promise<void> {
    const transparent = event.data.transparent;
    if (!transparent) {
      console.error(
        "[billing/abacatepay] transparent.completed sem data.transparent",
      );
      return;
    }

    // Só processamos PIX como topup. Se um dia ligarmos boleto/outros, o
    // discriminador é `methods` ou um campo extra no metadata.
    if (
      Array.isArray(transparent.methods) &&
      transparent.methods.length > 0 &&
      !transparent.methods.includes("PIX")
    ) {
      console.log(
        "[billing/abacatepay] transparent.completed ignorado (método não-PIX):",
        transparent.id,
      );
      return;
    }

    const intent = await this.deps.intents.findByAbacateId(transparent.id);
    if (!intent) {
      // Pode acontecer se: (1) o webhook chega antes do save() local
      // terminar (race), (2) é uma cobrança criada fora do nosso fluxo,
      // (3) ambiente errado (devMode mismatch). Logamos e ignoramos —
      // melhor perder esse webhook do que creditar errado. AbacatePay vai
      // reentregar; quando o intent existir, a gente processa.
      console.warn(
        "[billing/abacatepay] intent não encontrado pra cobrança:",
        transparent.id,
      );
      return;
    }

    // Idempotência por (event, intent, status). Dois webhooks PAID com a
    // mesma combinação são equivalentes — o segundo é descartado.
    const idempotencyKey = `${event.event}:${transparent.id}:${transparent.status}`;
    const { isNew } = await markEventProcessed({
      provider: "abacatepay",
      eventKey: idempotencyKey,
      eventType: event.event,
    });
    if (!isNew) return;

    // Defesa: se já marcamos PAID, não creditamos de novo (segunda
    // camada além do markEventProcessed — protege contra entries antigas
    // limpas pelo TTL da idempotência).
    if (intent.status === "PAID") {
      console.log(
        "[billing/abacatepay] intent já PAID, ignorando duplicata:",
        intent.abacateId,
      );
      return;
    }

    const topup = getTopup(intent.topupId);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + TOPUP_VALIDITY_DAYS);

    const wallet = CreditWallet.create({
      id: this.deps.wallets.nextId(),
      ownerId: intent.ownerId,
      source: "topup",
      initialBalance: topup.credits,
      expiresAt,
      // Reconciliação cross-sistema: prefixo identifica AbacatePay.
      externalRef: `abacate:${intent.abacateId}`,
      now,
    });
    await this.deps.wallets.save(wallet);

    const entry = LedgerEntry.create({
      id: this.deps.ledger.nextId(),
      ownerId: intent.ownerId,
      walletId: wallet.id,
      walletSource: wallet.source,
      type: "credit",
      amount: topup.credits,
      reason: "topup_purchase",
      relatedAction: `topup_${intent.topupId}`,
      metadata: {
        topupId: intent.topupId,
        paymentProvider: "abacatepay",
        abacateId: intent.abacateId,
        priceCents: topup.priceCents,
        expiresAt: expiresAt.toISOString(),
      },
      now,
    });
    await this.deps.ledger.save(entry);

    intent.markPaid({ walletId: wallet.id.toString(), paidAt: now });
    await this.deps.intents.save(intent);

    // Recibo por email — best effort. Pega email do customer do payload
    // se existir; senão deixa pra lá (créditos já caíram).
    const customerEmail = event.data.customer?.email;
    if (customerEmail) {
      try {
        await this.deps.mailer.sendTopupReceipt({
          to: customerEmail,
          customerName: event.data.customer?.name ?? null,
          creditsGranted: topup.credits,
          amountCents: topup.priceCents,
          receiptUrl: transparent.receiptUrl ?? null,
          expiresAt,
        });
      } catch (err) {
        console.error(
          "[billing/abacatepay] falha ao enviar recibo de topup PIX",
          err,
        );
      }
    }

    // NFS-e do top-up. ownerEmail vem do payload; se vazio, o
    // TakerResolver vai ler do user doc — descricao genérica idêntica
    // ao caminho Stripe pra UX consistente.
    await this.tryIssueInvoice({
      source: "topup_pix",
      externalRef: `abacate:${intent.abacateId}`,
      ownerId: intent.ownerId,
      ownerEmail: customerEmail ?? "",
      organizationId: null, // PIX hoje é sempre pessoal — quando virar institucional, ler do intent.metadata
      amountCents: topup.priceCents,
      description: `Lucida — Pacote de ${topup.credits.toLocaleString("pt-BR")} créditos`,
      metadata: {
        topupId: intent.topupId,
        abacateId: intent.abacateId,
        paymentProvider: "abacatepay",
      },
    });
  }

  private async tryIssueInvoice(input: IssueInvoiceInput): Promise<void> {
    if (!this.deps.issueInvoice) return;
    try {
      await this.deps.issueInvoice.execute(input);
    } catch (err) {
      console.error(
        "[billing/abacatepay] falha ao registrar invoice (skip):",
        input.externalRef,
        err,
      );
    }
  }
}
