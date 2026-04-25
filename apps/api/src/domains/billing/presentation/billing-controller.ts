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
import type { Auth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import { checkoutBody, ledgerQuery, topupBody } from "./billing-schemas.js";
import {
  getStripeClient,
  isStripeConfigured,
} from "../infrastructure/stripe/stripe-client.js";
import { DomainError } from "@/shared/errors/domain-error.js";

interface Deps {
  getBalance: GetBalanceUseCase;
  listLedger: ListLedgerUseCase;
  getCurrentSubscription: GetCurrentSubscriptionUseCase;
  createCheckoutSession: CreateCheckoutSessionUseCase;
  createTopupCheckoutSession: CreateTopupCheckoutSessionUseCase;
  createPortalSession: CreatePortalSessionUseCase;
  handleStripeWebhook: HandleStripeWebhookUseCase;
  expireStaleWallets: ExpireStaleWalletsUseCase;
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

      // Pega email+name do user via BetterAuth — necessário pro Stripe Customer.
      const session = await this.deps.auth.api.getSession({
        headers: req.headers as unknown as Headers,
      });
      if (!session) {
        throw new Error("Sessão não encontrada.");
      }

      const { url } = await this.deps.createCheckoutSession.execute({
        ownerId,
        ownerEmail: session.user.email,
        ownerName: session.user.name ?? null,
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

      const { url } = await this.deps.createTopupCheckoutSession.execute({
        ownerId,
        ownerEmail: session.user.email,
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
