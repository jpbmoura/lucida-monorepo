import { Router, type RequestHandler } from "express";
import type { AnalyticsController } from "./analytics-controller.js";
import type { AssistantController } from "@/domains/iam/presentation/assistant-controller.js";

export function makeAnalyticsRouter({
  requireAuth,
  requireOrgAdmin,
  controller,
  assistantController,
}: {
  requireAuth: RequestHandler;
  /**
   * Exige role owner/admin na org ativa. Aplicado nos endpoints restritos
   * a administradores de instituição — members comuns recebem 403.
   */
  requireOrgAdmin: RequestHandler;
  controller: AnalyticsController;
  /**
   * Opcional. Quando provido, expõe os endpoints de gestão de auxiliares
   * sob `/v1/analytics/teachers/:id/assistants` — protegidos por
   * requireOrgAdmin igual o resto da gestão institucional.
   */
  assistantController?: AssistantController;
}): Router {
  const router = Router();
  router.get("/v1/analytics/overview", requireAuth, controller.overview);
  router.get(
    "/v1/analytics/org-overview",
    requireAuth,
    requireOrgAdmin,
    controller.orgOverview,
  );
  router.get(
    "/v1/analytics/active-organization",
    requireAuth,
    controller.activeOrganization,
  );
  router.get(
    "/v1/analytics/members-and-invitations",
    requireAuth,
    requireOrgAdmin,
    controller.membersAndInvitations,
  );
  router.get(
    "/v1/analytics/org-billing",
    requireAuth,
    requireOrgAdmin,
    controller.orgBilling,
  );
  router.get(
    "/v1/analytics/teachers/:id",
    requireAuth,
    requireOrgAdmin,
    controller.teacherOverview,
  );
  router.get(
    "/v1/analytics/teachers/:id/export",
    requireAuth,
    requireOrgAdmin,
    controller.teacherExport,
  );
  // Impersonate — owner/admin "vira" um professor da org pra navegar no
  // /app como se fosse ele. Validações ficam no controller (não no
  // middleware) pra dar mensagens específicas.
  router.post(
    "/v1/analytics/impersonate",
    requireAuth,
    requireOrgAdmin,
    controller.startImpersonate,
  );
  // Stop não exige requireOrgAdmin — o cookie pertence à sessão do user e
  // qualquer um logado pode encerrar o próprio impersonate.
  router.delete(
    "/v1/analytics/impersonate",
    requireAuth,
    controller.stopImpersonate,
  );
  // Estado atual: o frontend lê isso pra mostrar o banner amarelo "Atuando
  // como X" no topbar do /app.
  router.get(
    "/v1/analytics/impersonate",
    requireAuth,
    controller.impersonateState,
  );
  // Sem requireAuth: a posse do ID do invite já é o token de autorização
  // (só quem recebeu o email tem o id). Expor info pública aqui deixa a
  // página /accept-invite buscar o contexto sem exigir login/conta.
  router.get(
    "/v1/analytics/invitation-info/:id",
    controller.invitationInfo,
  );
  router.post(
    "/v1/analytics/accept-invite-with-signup",
    controller.acceptInviteWithSignup,
  );
  router.get(
    "/v1/analytics/classes/:id",
    requireAuth,
    controller.classOverview,
  );
  router.get(
    "/v1/analytics/students/:id",
    requireAuth,
    controller.studentOverview,
  );
  router.get("/v1/analytics/exams/:id", requireAuth, controller.examOverview);

  // ─── Gestão de auxiliares (admin org → professores da org) ─────────
  if (assistantController) {
    router.get(
      "/v1/analytics/teachers/:teacherId/assistants",
      requireAuth,
      requireOrgAdmin,
      assistantController.listForTeacher,
    );
    router.post(
      "/v1/analytics/teachers/:teacherId/assistants",
      requireAuth,
      requireOrgAdmin,
      assistantController.create,
    );
    router.delete(
      "/v1/analytics/assistants/:linkId",
      requireAuth,
      requireOrgAdmin,
      assistantController.revoke,
    );
  }
  return router;
}
