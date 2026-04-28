import type { RequestHandler } from "express";
import { env } from "@/env.js";
import type { GetBalanceUseCase } from "../application/get-balance.js";
import type { ListLedgerUseCase } from "../application/list-ledger.js";
import type { GetCurrentSubscriptionUseCase } from "../application/get-current-subscription.js";
import type { CreateCheckoutSessionUseCase } from "../application/create-checkout-session.js";
import type { CreateTopupCheckoutSessionUseCase } from "../application/create-topup-checkout-session.js";
import type { CreatePortalSessionUseCase } from "../application/create-portal-session.js";
import type { HandleStripeWebhookUseCase } from "../application/handle-stripe-webhook.js";
import type { ExpireStaleWalletsUseCase } from "../application/expire-stale-wallets.js";
import type { CreatePixTopupUseCase } from "../application/create-pix-topup.js";
import type { GetPixTopupStatusUseCase } from "../application/get-pix-topup-status.js";
import type { HandleAbacatePayWebhookUseCase } from "../application/handle-abacatepay-webhook.js";
import type { Auth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import {
  checkoutBody,
  ledgerQuery,
  pixTopupBody,
  pixTopupParam,
  topupBody,
} from "./billing-schemas.js";
import {
  getStripeClient,
  isStripeConfigured,
} from "../infrastructure/stripe/stripe-client.js";
import { isAbacatePayConfigured } from "../infrastructure/abacatepay/abacatepay-client.js";
import { abacatePayEventSchema } from "../infrastructure/abacatepay/abacatepay-event-schema.js";
import { verifyAbacatePayWebhook } from "../infrastructure/abacatepay/abacatepay-webhook-verify.js";
import { DomainError } from "@/shared/errors/domain-error.js";
import {
  AbacatePayNotConfiguredError,
  TaxIdRequiredError,
} from "../domain/billing-errors.js";

interface Deps {
  getBalance: GetBalanceUseCase;
  listLedger: ListLedgerUseCase;
  getCurrentSubscription: GetCurrentSubscriptionUseCase;
  createCheckoutSession: CreateCheckoutSessionUseCase;
  createTopupCheckoutSession: CreateTopupCheckoutSessionUseCase;
  createPortalSession: CreatePortalSessionUseCase;
  handleStripeWebhook: HandleStripeWebhookUseCase;
  expireStaleWallets: ExpireStaleWalletsUseCase;
  createPixTopup: CreatePixTopupUseCase;
  getPixTopupStatus: GetPixTopupStatusUseCase;
  handleAbacatePayWebhook: HandleAbacatePayWebhookUseCase;
  auth: Auth;
}

class StripeNotConfiguredError extends DomainError {
  readonly code = "STRIPE_NOT_CONFIGURED";
  readonly statusCode = 503;
  constructor() {
    super("Pagamentos ainda não estão habilitados neste ambiente.");
  }
}

export class BillingController {
  constructor(private readonly deps: Deps) {}

  balance: RequestHandler = async (req, res, next) => {
    try {
      const data = await this.deps.getBalance.execute({
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  ledger: RequestHandler = async (req, res, next) => {
    try {
      const query = ledgerQuery.parse(req.query);
      const data = await this.deps.listLedger.execute({
        ownerId: req.auth!.userId,
        limit: query.limit,
        before: query.before,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  currentSubscription: RequestHandler = async (req, res, next) => {
    try {
      const data = await this.deps.getCurrentSubscription.execute({
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  checkout: RequestHandler = async (req, res, next) => {
    try {
      if (!isStripeConfigured()) throw new StripeNotConfiguredError();
      const { planId } = checkoutBody.parse(req.body);
      const ownerId = req.auth!.userId;

      // Pega email+name+taxId do user via BetterAuth — necessário pro Stripe Customer.
      const session = await this.deps.auth.api.getSession({
        headers: req.headers as unknown as Headers,
      });
      if (!session) {
        throw new Error("Sessão não encontrada.");
      }
      const taxId = readTaxIdFromUser(session.user);
      if (!taxId) throw new TaxIdRequiredError();

      const { url } = await this.deps.createCheckoutSession.execute({
        ownerId,
        ownerEmail: session.user.email,
        ownerName: session.user.name ?? null,
        taxId,
        planId,
        successUrl: `${env.WEB_ORIGIN}/app/billing?checkout=success`,
        cancelUrl: `${env.WEB_ORIGIN}/precos?checkout=canceled`,
      });
      res.json({ data: { url } });
    } catch (err) {
      next(err);
    }
  };

  topupCheckout: RequestHandler = async (req, res, next) => {
    try {
      if (!isStripeConfigured()) throw new StripeNotConfiguredError();
      const { topupId } = topupBody.parse(req.body);
      const ownerId = req.auth!.userId;

      const session = await this.deps.auth.api.getSession({
        headers: req.headers as unknown as Headers,
      });
      if (!session) {
        throw new Error("Sessão não encontrada.");
      }
      const taxId = readTaxIdFromUser(session.user);
      if (!taxId) throw new TaxIdRequiredError();

      const { url } = await this.deps.createTopupCheckoutSession.execute({
        ownerId,
        ownerEmail: session.user.email,
        taxId,
        topupId,
        successUrl: `${env.WEB_ORIGIN}/app/billing?checkout=success`,
        cancelUrl: `${env.WEB_ORIGIN}/app/billing?checkout=canceled`,
      });
      res.json({ data: { url } });
    } catch (err) {
      next(err);
    }
  };

  portal: RequestHandler = async (req, res, next) => {
    try {
      if (!isStripeConfigured()) throw new StripeNotConfiguredError();
      const { url } = await this.deps.createPortalSession.execute({
        ownerId: req.auth!.userId,
        returnUrl: `${env.WEB_ORIGIN}/app/billing`,
      });
      res.json({ data: { url } });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /v1/billing/topup/pix — gera QR PIX via AbacatePay.
   * O body traz `taxId` explícito; a gente valida que bate com o do user
   * (ou salva, se ainda não tinha) pra manter session e doc consistentes.
   */
  pixTopup: RequestHandler = async (req, res, next) => {
    try {
      if (!isAbacatePayConfigured()) throw new AbacatePayNotConfiguredError();
      const { topupId, taxId } = pixTopupBody.parse(req.body);
      const ownerId = req.auth!.userId;

      const session = await this.deps.auth.api.getSession({
        headers: req.headers as unknown as Headers,
      });
      if (!session) {
        throw new Error("Sessão não encontrada.");
      }

      const data = await this.deps.createPixTopup.execute({
        ownerId,
        ownerEmail: session.user.email,
        ownerName: session.user.name ?? null,
        taxId,
        topupId,
      });
      res.json({
        data: {
          abacateId: data.abacateId,
          brCode: data.brCode,
          brCodeBase64: data.brCodeBase64,
          expiresAt: data.expiresAt.toISOString(),
          amountCents: data.amountCents,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /v1/billing/topup/pix/:abacateId — espelho local do status.
   * Front polla esse endpoint enquanto o modal PIX está aberto.
   */
  pixTopupStatus: RequestHandler = async (req, res, next) => {
    try {
      const { abacateId } = pixTopupParam.parse(req.params);
      const data = await this.deps.getPixTopupStatus.execute({
        abacateId,
        ownerId: req.auth!.userId,
      });
      res.json({
        data: {
          abacateId: data.abacateId,
          status: data.status,
          effectiveStatus: data.effectiveStatus,
          amountCents: data.amountCents,
          expiresAt: data.expiresAt.toISOString(),
          paidAt: data.paidAt?.toISOString() ?? null,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Webhook Stripe — raw body (montado em rota separada com express.raw()).
   * Valida assinatura com STRIPE_WEBHOOK_SECRET e delega pro use case.
   */
  webhook: RequestHandler = async (req, res, next) => {
    try {
      if (!env.STRIPE_WEBHOOK_SECRET) {
        res.status(503).end();
        return;
      }
      const sig = req.headers["stripe-signature"];
      if (typeof sig !== "string") {
        res.status(400).send("Missing stripe-signature header.");
        return;
      }
      const stripe = getStripeClient();
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body as Buffer,
          sig,
          env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        res
          .status(400)
          .send(`Webhook signature invalid: ${(err as Error).message}`);
        return;
      }

      await this.deps.handleStripeWebhook.execute(event);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error("[billing] webhook handler error", err);
      next(err);
    }
  };

  /**
   * Webhook AbacatePay — autenticado por `?webhookSecret=` na query.
   * Aceita JSON parseado normalmente (não precisa de raw body em v2,
   * já que não há HMAC sobre o corpo).
   *
   * Sempre devolve 200 quando o secret bate; falhas internas viram log
   * mas não voltam pra AbacatePay como 5xx (evita cascata de retries em
   * problemas que não são culpa do remetente). Erros de schema/secret
   * sim voltam 4xx pro provedor não tentar de novo com o mesmo payload.
   */
  abacatepayWebhook: RequestHandler = async (req, res) => {
    if (!env.ABACATEPAY_WEBHOOK_SECRET) {
      res.status(503).end();
      return;
    }

    const ok = verifyAbacatePayWebhook(req, env.ABACATEPAY_WEBHOOK_SECRET);
    if (!ok) {
      res.status(401).json({ error: "Invalid webhook secret." });
      return;
    }

    const parsed = abacatePayEventSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error(
        "[billing/abacatepay] payload inválido:",
        parsed.error.message,
      );
      res.status(400).json({ error: "Invalid payload." });
      return;
    }

    try {
      await this.deps.handleAbacatePayWebhook.execute(parsed.data);
    } catch (err) {
      // Loga mas devolve 200 — o evento é guardado pra inspeção e a
      // gente prefere não fazer AbacatePay reentregar indefinidamente
      // por bug nosso. Se for transitório (Mongo down), o webhook é
      // recriado quando o user reabrir o modal e o front re-pollar.
      console.error("[billing/abacatepay] handler error", err);
    }
    res.status(200).json({ received: true });
  };

  /**
   * Endpoint interno pra cron externo (Railway Cron Jobs, GitHub Actions etc).
   * Protegido por `x-cron-secret` — sem o header correto devolve 404
   * (não 401 pra não dar dica de existência).
   */
  expireCredits: RequestHandler = async (req, res, next) => {
    try {
      if (!env.CRON_SECRET) {
        res.status(503).json({
          code: "CRON_NOT_CONFIGURED",
          message: "CRON_SECRET não está definido.",
        });
        return;
      }
      const header = req.headers["x-cron-secret"];
      if (header !== env.CRON_SECRET) {
        res.status(404).end();
        return;
      }
      const result = await this.deps.expireStaleWallets.execute();
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Lê `taxId` do user da BetterAuth. O additionalFields adiciona o campo
 * dinamicamente, mas o tipo do session.user em runtime ainda é genérico —
 * por isso o cast localizado.
 */
function readTaxIdFromUser(user: unknown): string | null {
  if (typeof user !== "object" || user === null) return null;
  const value = (user as { taxId?: unknown }).taxId;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{11}$|^\d{14}$/.test(trimmed)) return null;
  return trimmed;
}
