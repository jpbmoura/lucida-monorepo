import { Router, type RequestHandler } from "express";
import type { KanbanController } from "./kanban-controller.js";

interface MakeKanbanRouterDeps {
  requireAuth: RequestHandler;
  requireStaff: RequestHandler;
  controller: KanbanController;
}

export function makeKanbanRouter({
  requireAuth,
  requireStaff,
  controller,
}: MakeKanbanRouterDeps): Router {
  const router = Router();
  // Board é staff-only — encadeia auth + staff por rota.
  router.get(
    "/api/kintal/board/cards",
    requireAuth,
    requireStaff,
    controller.list,
  );
  router.post(
    "/api/kintal/board/cards",
    requireAuth,
    requireStaff,
    controller.create,
  );
  router.patch(
    "/api/kintal/board/cards/:cardId",
    requireAuth,
    requireStaff,
    controller.update,
  );
  router.post(
    "/api/kintal/board/cards/:cardId/move",
    requireAuth,
    requireStaff,
    controller.move,
  );
  router.delete(
    "/api/kintal/board/cards/:cardId",
    requireAuth,
    requireStaff,
    controller.remove,
  );
  return router;
}
