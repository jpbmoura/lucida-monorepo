import { Router, type RequestHandler } from "express";
import type { ApiAccessController } from "./api-access-controller.js";

/**
 * Rotas do dashboard de gestão de API keys e webhook endpoints. Todas
 * autenticadas via sessão BA (não Bearer — Bearer é Fase B) e gated por
 * `requireOrgAdmin` — só owner/admin da org ativa gerencia chaves e
 * webhooks (member comum recebe 403).
 */
export function makeApiAccessRouter({
  requireAuth,
  requireOrgAdmin,
  controller,
}: {
  requireAuth: RequestHandler;
  requireOrgAdmin: RequestHandler;
  controller: ApiAccessController;
}): Router {
  const router = Router();

  // Metadata — só exige auth (member também pode ler, caso futuramente
  // alguma UI de member mostre "minhas permissões"). Baratíssimo.
  router.get(
    "/v1/analytics/developer/metadata",
    requireAuth,
    controller.metadata,
  );

  router.get(
    "/v1/analytics/developer/api-keys",
    requireAuth,
    requireOrgAdmin,
    controller.listKeys,
  );
  router.post(
    "/v1/analytics/developer/api-keys",
    requireAuth,
    requireOrgAdmin,
    controller.createKey,
  );
  router.delete(
    "/v1/analytics/developer/api-keys/:id",
    requireAuth,
    requireOrgAdmin,
    controller.revokeKey,
  );

  router.get(
    "/v1/analytics/developer/webhook-endpoints",
    requireAuth,
    requireOrgAdmin,
    controller.listEndpoints,
  );
  router.post(
    "/v1/analytics/developer/webhook-endpoints",
    requireAuth,
    requireOrgAdmin,
    controller.createEndpoint,
  );
  router.patch(
    "/v1/analytics/developer/webhook-endpoints/:id",
    requireAuth,
    requireOrgAdmin,
    controller.updateEndpoint,
  );
  router.post(
    "/v1/analytics/developer/webhook-endpoints/:id/rotate-secret",
    requireAuth,
    requireOrgAdmin,
    controller.rotateEndpointSecret,
  );
  router.delete(
    "/v1/analytics/developer/webhook-endpoints/:id",
    requireAuth,
    requireOrgAdmin,
    controller.deleteEndpoint,
  );

  return router;
}
