import { Router, type RequestHandler } from "express";
import type { StudentController } from "./student-controller.js";

export function makeStudentRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: StudentController;
}): Router {
  const router = Router();
  router.get("/v1/classes/:classId/students", requireAuth, controller.listByClass);
  router.post("/v1/classes/:classId/students", requireAuth, controller.createInClass);
  router.put("/v1/students/:id", requireAuth, controller.update);
  router.delete("/v1/students/:id", requireAuth, controller.delete);
  return router;
}
