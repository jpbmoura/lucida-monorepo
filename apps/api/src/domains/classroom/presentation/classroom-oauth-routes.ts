import { Router } from "express";
import type { ClassroomController } from "./classroom-controller.js";

/**
 * Rota PÚBLICA do callback OAuth (Google → API). Sem requireAuth — a
 * identidade do professor vem no `state` assinado. O handler sempre faz
 * redirect pro web, nunca devolve JSON.
 *
 * `redirect_uri` registrado no Google:
 *   ${AUTH_BASE_URL}/v1/integrations/classroom/oauth/callback
 */
export function makeClassroomOAuthRouter({
  controller,
}: {
  controller: ClassroomController;
}): Router {
  const router = Router();
  router.get(
    "/v1/integrations/classroom/oauth/callback",
    controller.oauthCallback,
  );
  return router;
}
