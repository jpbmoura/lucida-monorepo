import { Router, type RequestHandler } from "express";
import type { NotificationReceiverController } from "./notification-receiver-controller.js";
import type { NotificationSenderController } from "./notification-sender-controller.js";

interface MakeReceiverRouterDeps {
  requireAuth: RequestHandler;
  controller: NotificationReceiverController;
}

interface MakeSenderRoutersDeps {
  requireAuth: RequestHandler;
  requireStaff: RequestHandler;
  requireOrgAdmin: RequestHandler;
  controller: NotificationSenderController;
}

/**
 * Inbox routes — qualquer user autenticado acessa o seu próprio inbox.
 * Uso: bell icon, /app/notificacoes, /analytics/notificacoes.
 */
export function makeNotificationReceiverRouter({
  requireAuth,
  controller,
}: MakeReceiverRouterDeps): Router {
  const router = Router();
  router.get("/api/notifications", requireAuth, controller.list);
  router.get(
    "/api/notifications/unread-count",
    requireAuth,
    controller.unreadCount,
  );
  router.post(
    "/api/notifications/mark-all-read",
    requireAuth,
    controller.markAllAsRead,
  );
  router.post(
    "/api/notifications/:notificationId/read",
    requireAuth,
    controller.markAsRead,
  );
  router.delete(
    "/api/notifications/:notificationId",
    requireAuth,
    controller.dismiss,
  );
  return router;
}

/**
 * Sender routes pra staff (Kintal) e org admin (analytics). Cada um tem
 * sua árvore distinta com middleware próprio. Mesmo controller, métodos
 * diferentes — porque audiência permitida e contexto de sender variam.
 */
export function makeNotificationSenderRouters({
  requireAuth,
  requireStaff,
  requireOrgAdmin,
  controller,
}: MakeSenderRoutersDeps): { staff: Router; orgAdmin: Router } {
  const staff = Router();
  staff.post(
    "/api/kintal/notifications",
    requireAuth,
    requireStaff,
    controller.sendAsStaff,
  );
  staff.get(
    "/api/kintal/notifications/campaigns",
    requireAuth,
    requireStaff,
    controller.listCampaignsAsStaff,
  );
  staff.get(
    "/api/kintal/notifications/campaigns/:campaignId",
    requireAuth,
    requireStaff,
    controller.getCampaignAsStaff,
  );
  staff.delete(
    "/api/kintal/notifications/campaigns/:campaignId",
    requireAuth,
    requireStaff,
    controller.deleteCampaignAsStaff,
  );

  const orgAdmin = Router();
  orgAdmin.post(
    "/api/analytics/notifications",
    requireAuth,
    requireOrgAdmin,
    controller.sendAsOrgAdmin,
  );
  orgAdmin.get(
    "/api/analytics/notifications/campaigns",
    requireAuth,
    requireOrgAdmin,
    controller.listCampaignsAsOrgAdmin,
  );
  orgAdmin.get(
    "/api/analytics/notifications/campaigns/:campaignId",
    requireAuth,
    requireOrgAdmin,
    controller.getCampaignAsOrgAdmin,
  );
  orgAdmin.delete(
    "/api/analytics/notifications/campaigns/:campaignId",
    requireAuth,
    requireOrgAdmin,
    controller.deleteCampaignAsOrgAdmin,
  );

  return { staff, orgAdmin };
}
