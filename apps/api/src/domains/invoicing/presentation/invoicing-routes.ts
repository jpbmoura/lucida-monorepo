import express, { type RequestHandler, Router } from "express";
import type { InvoicingController } from "./invoicing-controller.js";

interface Deps {
  controller: InvoicingController;
}

/**
 * Router interno (cron-only). Sem auth — protegido por `x-cron-secret`
 * dentro do controller. Mesmo modelo de `makeBillingInternalRouter`.
 */
export function makeInvoicingInternalRouter({ controller }: Deps): Router {
  const router = Router();
  router.post(
    "/v1/internal/invoicing/process-pending",
    controller.processPending,
  );
  return router;
}

/**
 * Router público com body bruto — webhook NFE.io. Precisa ser montado
 * em `rawBodyRouters` (antes do `express.json()` global) pra que a
 * verificação HMAC tenha acesso aos bytes exatos do payload assinado.
 */
export function makeInvoicingPublicRouter({ controller }: Deps): Router {
  const router = Router();
  router.post(
    "/v1/invoicing/webhook",
    express.raw({ type: "application/json" }),
    controller.webhook,
  );
  return router;
}

/**
 * Router autenticado. Listagens das notas:
 *  - /me            → notas do user logado (acessível a qualquer user)
 *  - /organization  → notas da org ativa (gated por requireOrgAdmin)
 */
export function makeInvoicingAuthedRouter({
  requireAuth,
  requireOrgAdmin,
  controller,
}: Deps & {
  requireAuth: RequestHandler;
  requireOrgAdmin: RequestHandler;
}): Router {
  const router = Router();
  router.get("/v1/invoicing/me", requireAuth, controller.listMine);
  router.get(
    "/v1/invoicing/organization",
    requireAuth,
    requireOrgAdmin,
    controller.listOrganization,
  );
  return router;
}
