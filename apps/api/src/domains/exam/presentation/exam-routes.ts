import { Router, type RequestHandler } from "express";
import type { ExamController } from "./exam-controller.js";

export function makeExamRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: ExamController;
}): Router {
  const router = Router();
  router.get("/v1/classes/:classId/exams", requireAuth, controller.listByClass);
  router.post("/v1/exams", requireAuth, controller.create);
  router.post("/v1/exams/:id/copy", requireAuth, controller.copyToClass);
  router.get("/v1/exams/:id", requireAuth, controller.get);
  router.put("/v1/exams/:id", requireAuth, controller.update);
  router.delete("/v1/exams/:id", requireAuth, controller.delete);
  router.get("/v1/exams/:id/export.docx", requireAuth, controller.exportDocx);
  return router;
}
