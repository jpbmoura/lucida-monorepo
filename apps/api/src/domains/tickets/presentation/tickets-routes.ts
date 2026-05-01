import express, { type RequestHandler, Router } from "express";
import type { TicketsController } from "./tickets-controller.js";

interface Deps {
  controller: TicketsController;
}

interface AuthedDeps extends Deps {
  requireAuth: RequestHandler;
  requireStaff: RequestHandler;
}

/**
 * Router público — body bruto pro webhook Resend Inbound. Montado em
 * `rawBodyRouters` no main.ts (antes do express.json global).
 */
export function makeTicketsPublicRouter({ controller }: Deps): Router {
  const router = Router();
  router.post(
    "/v1/tickets/inbound",
    express.raw({ type: "application/json" }),
    controller.inboundWebhook,
  );
  return router;
}

/**
 * Router staff (Kintal). Todas as rotas exigem auth + role staff.
 */
export function makeTicketsStaffRouter({
  requireAuth,
  requireStaff,
  controller,
}: AuthedDeps): Router {
  const router = Router();
  router.get("/v1/tickets", requireAuth, requireStaff, controller.list);
  router.get("/v1/tickets/:id", requireAuth, requireStaff, controller.get);
  router.post(
    "/v1/tickets/:id/replies",
    requireAuth,
    requireStaff,
    controller.reply,
  );
  router.post(
    "/v1/tickets/:id/done",
    requireAuth,
    requireStaff,
    controller.markDone,
  );
  router.post(
    "/v1/tickets/:id/reopen",
    requireAuth,
    requireStaff,
    controller.reopen,
  );
  return router;
}
