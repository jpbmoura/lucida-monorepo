import { Router, type RequestHandler } from "express";
import type { ClassroomController } from "./classroom-controller.js";

/**
 * Rotas autenticadas da integração Classroom. Montadas DEPOIS do
 * express.json() (não mexem nos rawBodyRouters do Stripe).
 */
export function makeClassroomRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: ClassroomController;
}): Router {
  const router = Router();
  router.get("/v1/integrations/classroom/status", requireAuth, controller.status);
  router.get(
    "/v1/integrations/classroom/oauth/authorize-url",
    requireAuth,
    controller.authorizeUrl,
  );
  router.post(
    "/v1/integrations/classroom/disconnect",
    requireAuth,
    controller.disconnect,
  );
  router.get(
    "/v1/integrations/classroom/courses",
    requireAuth,
    controller.listCourses,
  );
  router.post(
    "/v1/integrations/classroom/courses/:classroomCourseId/import",
    requireAuth,
    controller.importCourse,
  );
  router.post(
    "/v1/integrations/classroom/classes/:classId/reconcile",
    requireAuth,
    controller.reconcile,
  );
  return router;
}
