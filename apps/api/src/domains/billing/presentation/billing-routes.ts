import express, { Router, type RequestHandler } from "express";
import type { BillingController } from "./billing-controller.js";
import { denyAssistant } from "@/domains/iam/presentation/middleware/deny-assistant.js";

/**
 * Auxiliares NÃO compram créditos em nome do professor — gating só nas
 * rotas que iniciam um checkout. Leituras (balance, ledger, subscription)
 * permanecem abertas pra que o auxiliar acompanhe consumo.
 */
const denyAssistantBuy = denyAssistant(
  "Compra de créditos só pelo professor titular.",
);

/**
 * Rotas PÚBLICAS — webhooks dos provedores de pagamento.
 *
 * Stripe webhook precisa do body BRUTO pra `stripe.webhooks.constructEvent`
 * verificar a assinatura — por isso o `express.raw({ type: 'application/json' })`
 * inline. Esse router precisa ser montado ANTES do `express.json()` global
 * (ver `app.ts → rawBodyRouters`).
 *
 * AbacatePay webhook NÃO usa HMAC sobre raw body (v2 só tem o
 * `?webhookSecret=` na query), então aceita JSON parseado normalmente.
 * A gente adiciona um `express.json` localmente já que o router é
 * montado antes do parser global.
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

  router.post(
    "/v1/billing/abacatepay/webhook",
    express.json({ limit: "1mb" }),
    controller.abacatepayWebhook,
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
    denyAssistantBuy,
    controller.checkout,
  );
  router.post(
    "/v1/billing/subscription/portal",
    requireAuth,
    denyAssistantBuy,
    controller.portal,
  );
  router.post(
    "/v1/billing/topup/checkout",
    requireAuth,
    denyAssistantBuy,
    controller.topupCheckout,
  );
  router.post(
    "/v1/billing/topup/pix",
    requireAuth,
    denyAssistantBuy,
    controller.pixTopup,
  );
  router.get(
    "/v1/billing/topup/pix/:abacateId",
    requireAuth,
    controller.pixTopupStatus,
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
