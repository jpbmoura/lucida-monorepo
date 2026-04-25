import { Router, type RequestHandler } from "express";
import type { ClassController } from "./class-controller.js";

export function makeClassRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: ClassController;
}): Router {
  const router = Router();
  // Middleware por rota — router.use(requireAuth) aplicaria a TODAS as requests
  // que atravessam o router, quebrando rotas públicas em outros routers.
  router.get("/v1/classes", requireAuth, controller.list);
  router.post("/v1/classes", requireAuth, controller.create);
  router.get("/v1/classes/:id", requireAuth, controller.get);
  router.put("/v1/classes/:id", requireAuth, controller.update);
  router.delete("/v1/classes/:id", requireAuth, controller.delete);
  return router;
}
