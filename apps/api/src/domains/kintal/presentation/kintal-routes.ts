import { Router, type RequestHandler } from "express";
import type { KintalController } from "./kintal-controller.js";
import type { KintalStaffController } from "./kintal-staff-controller.js";
import type { KintalUsersController } from "./kintal-users-controller.js";
import type { KintalInstitutionsController } from "./kintal-institutions-controller.js";
import type { KintalImpersonateController } from "./kintal-impersonate-controller.js";

interface MakeKintalRouterDeps {
  requireAuth: RequestHandler;
  requireStaff: RequestHandler;
  controller: KintalController;
  staffController: KintalStaffController;
  usersController: KintalUsersController;
  institutionsController: KintalInstitutionsController;
  impersonateController: KintalImpersonateController;
}

export function makeKintalRouter({
  requireAuth,
  requireStaff,
  controller,
  staffController,
  usersController,
  institutionsController,
  impersonateController,
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

  router.post(
    "/api/kintal/users/:userId/memberships",
    requireAuth,
    requireStaff,
    institutionsController.linkUserToInstitution,
  );
  router.delete(
    "/api/kintal/users/:userId/memberships/:orgId",
    requireAuth,
    requireStaff,
    institutionsController.unlinkUserFromInstitution,
  );

  // ─── Institutions ──────────────────────────────────────────────────
  router.get(
    "/api/kintal/institutions",
    requireAuth,
    requireStaff,
    institutionsController.list,
  );
  router.post(
    "/api/kintal/institutions",
    requireAuth,
    requireStaff,
    institutionsController.create,
  );
  router.get(
    "/api/kintal/institutions/:orgId",
    requireAuth,
    requireStaff,
    institutionsController.getOne,
  );
  router.patch(
    "/api/kintal/institutions/:orgId/billing",
    requireAuth,
    requireStaff,
    institutionsController.updateBilling,
  );
  router.post(
    "/api/kintal/institutions/:orgId/archive",
    requireAuth,
    requireStaff,
    institutionsController.archive,
  );
  router.post(
    "/api/kintal/institutions/:orgId/unarchive",
    requireAuth,
    requireStaff,
    institutionsController.unarchive,
  );
  router.post(
    "/api/kintal/institutions/:orgId/credits",
    requireAuth,
    requireStaff,
    institutionsController.adjustCredits,
  );
  router.post(
    "/api/kintal/institutions/:orgId/members",
    requireAuth,
    requireStaff,
    institutionsController.addMemberByEmail,
  );
  router.delete(
    "/api/kintal/institutions/:orgId/members/:userId",
    requireAuth,
    requireStaff,
    institutionsController.removeMember,
  );

  // ─── Impersonate (staff "vira" o user pra navegar como ele) ────────
  // Start exige staff. Stop é safe pra qualquer auth — se não há sessão
  // aberta, é no-op (idempotente). O cookie compartilhado com /analytics
  // significa que o middleware resolve ambos caminhos automaticamente.
  router.post(
    "/api/kintal/impersonate",
    requireAuth,
    requireStaff,
    impersonateController.start,
  );
  router.delete(
    "/api/kintal/impersonate",
    requireAuth,
    impersonateController.stop,
  );

  return router;
}
