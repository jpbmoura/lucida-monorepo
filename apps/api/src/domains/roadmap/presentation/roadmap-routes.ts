import { Router, type RequestHandler } from "express";
import type { RoadmapController } from "./roadmap-controller.js";
import type { RoadmapStaffController } from "./roadmap-staff-controller.js";

interface MakeRoadmapRouterDeps {
  /**
   * Middleware "soft" — tenta hidratar `req.auth` mas não dá throw quando
   * não há sessão. Necessário pra que o GET público marque os votos do
   * viewer logado e libere createdBy pra staff, sem deslogar quem entra
   * anônimo.
   */
  optionalAuth: RequestHandler;
  /** Estrito — bloqueia 401 se não há sessão. */
  requireAuth: RequestHandler;
  /** Encadeado depois do requireAuth pra rotas só-staff. */
  requireStaff: RequestHandler;
  controller: RoadmapController;
  staffController: RoadmapStaffController;
}

export function makeRoadmapRouter({
  optionalAuth,
  requireAuth,
  requireStaff,
  controller,
  staffController,
}: MakeRoadmapRouterDeps): Router {
  const router = Router();

  // Público — opcional-auth permite ler como anônimo, e enriquecer quando
  // logado (votos marcados, createdBy se for staff).
  router.get("/api/roadmap", optionalAuth, controller.list);

  // Autenticadas (qualquer user) — votar e sugerir.
  router.post("/api/roadmap/suggestions", requireAuth, controller.suggest);
  router.post("/api/roadmap/:id/vote", requireAuth, controller.vote);
  router.delete("/api/roadmap/:id/vote", requireAuth, controller.unvote);

  // Staff — criar, editar, excluir.
  router.post(
    "/api/roadmap",
    requireAuth,
    requireStaff,
    staffController.create,
  );
  router.put(
    "/api/roadmap/:id",
    requireAuth,
    requireStaff,
    staffController.update,
  );
  router.delete(
    "/api/roadmap/:id",
    requireAuth,
    requireStaff,
    staffController.delete,
  );

  return router;
}
