import { Router, type RequestHandler } from "express";
import type { KintalController } from "./kintal-controller.js";
import type { KintalStaffController } from "./kintal-staff-controller.js";
import type { KintalUsersController } from "./kintal-users-controller.js";

interface MakeKintalRouterDeps {
  requireAuth: RequestHandler;
  requireStaff: RequestHandler;
  controller: KintalController;
  staffController: KintalStaffController;
  usersController: KintalUsersController;
}

export function makeKintalRouter({
  requireAuth,
  requireStaff,
  controller,
  staffController,
  usersController,
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

  router.get(
    "/api/kintal/users",
    requireAuth,
    requireStaff,
    usersController.list,
  );
  router.get(
    "/api/kintal/users/:userId",
    requireAuth,
    requireStaff,
    usersController.getOne,
  );
  router.patch(
    "/api/kintal/users/:userId",
    requireAuth,
    requireStaff,
    usersController.update,
  );
  router.post(
    "/api/kintal/users/:userId/credits",
    requireAuth,
    requireStaff,
    usersController.adjustCredits,
  );

  return router;
}
