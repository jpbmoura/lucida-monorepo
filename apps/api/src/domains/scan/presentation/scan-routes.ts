import { Router, type RequestHandler } from "express";
import type { ScanController } from "./scan-controller.js";

export function makeScanRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: ScanController;
}): Router {
  const router = Router();
  router.post("/v1/exams/:id/scan", requireAuth, controller.scan);
  router.get("/v1/exams/:id/scans", requireAuth, controller.listByExam);
  router.post("/v1/scans/:id/approve", requireAuth, controller.approve);
  router.delete("/v1/scans/:id", requireAuth, controller.delete);
  return router;
}
