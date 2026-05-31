import { Router, type RequestHandler } from "express";
import type { SlideDeckController } from "./slide-deck-controller.js";

export function makeSlideDeckRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: SlideDeckController;
}): Router {
  const router = Router();
  router.get("/v1/slide-decks", requireAuth, controller.list);
  router.post("/v1/slide-decks", requireAuth, controller.create);
  router.get("/v1/slide-decks/:id", requireAuth, controller.get);
  router.put("/v1/slide-decks/:id", requireAuth, controller.update);
  router.post("/v1/slide-decks/:id/reorder", requireAuth, controller.reorder);
  router.delete("/v1/slide-decks/:id", requireAuth, controller.delete);
  return router;
}
