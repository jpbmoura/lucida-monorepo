import { Router, type RequestHandler } from "express";
import type { LessonPlanController } from "./lesson-plan-controller.js";

export function makeLessonPlanRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: LessonPlanController;
}): Router {
  const router = Router();
  router.get(
    "/v1/classes/:classId/lesson-plans",
    requireAuth,
    controller.listByClass,
  );
  router.post("/v1/lesson-plans", requireAuth, controller.create);
  router.get("/v1/lesson-plans/:id", requireAuth, controller.get);
  router.put("/v1/lesson-plans/:id", requireAuth, controller.update);
  router.post("/v1/lesson-plans/:id/duplicate", requireAuth, controller.duplicate);
  router.post("/v1/lesson-plans/:id/archive", requireAuth, controller.archive);
  router.delete("/v1/lesson-plans/:id", requireAuth, controller.delete);
  router.get(
    "/v1/lesson-plans/:id/export.docx",
    requireAuth,
    controller.exportDocx,
  );
  return router;
}
