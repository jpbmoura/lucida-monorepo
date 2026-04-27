import { Router, type RequestHandler } from "express";
import type { OrganizationPreferencesController } from "./organization-preferences-controller.js";

interface MakeRouterDeps {
  requireAuth: RequestHandler;
  /** Só owner/admin da org pode editar preferências. */
  requireOrgAdmin: RequestHandler;
  controller: OrganizationPreferencesController;
}

export function makeOrganizationPreferencesRouter({
  requireAuth,
  requireOrgAdmin,
  controller,
}: MakeRouterDeps): Router {
  const router = Router();
  // GET é membro+ (qualquer member pode ler — útil pra UI mostrar o
  // scope atual mesmo pra não-admins). PUT é admin-only.
  router.get(
    "/v1/analytics/organization/preferences",
    requireAuth,
    controller.get,
  );
  router.put(
    "/v1/analytics/organization/preferences",
    requireAuth,
    requireOrgAdmin,
    controller.update,
  );
  return router;
}
