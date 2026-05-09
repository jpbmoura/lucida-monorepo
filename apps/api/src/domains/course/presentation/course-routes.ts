import { Router, type RequestHandler } from "express";
import type { CourseController } from "./course-controller.js";

export function makeCourseRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: CourseController;
}): Router {
  const router = Router();
  // Middleware por rota — segue o padrão de class-routes pra não quebrar
  // outros routers que possam compartilhar instância.
  router.get("/v1/courses", requireAuth, controller.list);
  router.post("/v1/courses", requireAuth, controller.create);
  router.get("/v1/courses/:id", requireAuth, controller.get);
  router.put("/v1/courses/:id", requireAuth, controller.update);
  router.delete("/v1/courses/:id", requireAuth, controller.delete);
  return router;
}
