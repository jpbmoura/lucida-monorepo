import { Router, type RequestHandler } from "express";
import type { KintalController } from "./kintal-controller.js";
import type { KintalStaffController } from "./kintal-staff-controller.js";

interface MakeKintalRouterDeps {
  requireAuth: RequestHandler;
  requireStaff: RequestHandler;
  controller: KintalController;
  staffController: KintalStaffController;
}

export function makeKintalRouter({
  requireAuth,
  requireStaff,
  controller,
  staffController,
}: MakeKintalRouterDeps): Router {
  const router = Router();
  // Todas as rotas do Kintal são staff-only — encadeia requireAuth +
  // requireStaff por rota (evita router.use e mantém explícito).
  router.get(
    "/api/kintal/dashboard",
    requireAuth,
    requireStaff,
    controller.getDashboard,
  );

  router.get(
    "/api/kintal/staff",
    requireAuth,
    requireStaff,
    staffController.list,
  );
  router.post(
    "/api/kintal/staff",
    requireAuth,
    requireStaff,
    staffController.promote,
  );
  router.delete(
    "/api/kintal/staff/:userId",
    requireAuth,
    requireStaff,
    staffController.revoke,
  );

  return router;
}
