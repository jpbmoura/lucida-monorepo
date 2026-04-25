import { Router, type RequestHandler } from "express";
import type { SupportController } from "./support-controller.js";

interface MakeSupportRouterDeps {
  requireAuth: RequestHandler;
  controller: SupportController;
}

export function makeSupportRouter({
  requireAuth,
  controller,
}: MakeSupportRouterDeps): Router {
  const router = Router();
  router.post("/v1/support/contact", requireAuth, controller.send);
  return router;
}
