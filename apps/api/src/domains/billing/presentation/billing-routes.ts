import express, { Router, type RequestHandler } from "express";
import type { BillingController } from "./billing-controller.js";

/**
 * Rotas PÚBLICAS — apenas o webhook Stripe.
 * IMPORTANTE: esse router precisa ser montado ANTES do express.json() global
 * em app.ts. A verificação de assinatura Stripe exige o body bruto.
 */
export function makeBillingPublicRouter({
  controller,
}: {
  controller: BillingController;
}): Router {
  const router = Router();
  router.post(
    "/v1/billing/webhook",
    express.raw({ type: "application/json" }),
    controller.webhook,
  );
  return router;
}

export function makeBillingAuthedRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: BillingController;
}): Router {
  const router = Router();
  router.get("/v1/billing/balance", requireAuth, controller.balance);
  router.get("/v1/billing/ledger", requireAuth, controller.ledger);
  router.get(
    "/v1/billing/subscription",
    requireAuth,
    controller.currentSubscription,
  );
  router.post(
    "/v1/billing/subscription/checkout",
    requireAuth,
    controller.checkout,
  );
  router.post(
    "/v1/billing/subscription/portal",
    requireAuth,
    controller.portal,
  );
  router.post(
    "/v1/billing/topup/checkout",
    requireAuth,
    controller.topupCheckout,
  );
  return router;
}

/**
 * Rota INTERNA — protegida por `x-cron-secret` (não auth de user).
 * Usada por cron externo (Railway Cron Jobs, GitHub Actions, etc) pra
 * rodar expiração de wallets diariamente.
 */
export function makeBillingInternalRouter({
  controller,
}: {
  controller: BillingController;
}): Router {
  const router = Router();
  router.post("/v1/internal/expire-credits", controller.expireCredits);
  return router;
}
