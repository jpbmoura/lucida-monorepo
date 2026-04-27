import type { RequestHandler } from "express";
import type { SendNotificationUseCase } from "../application/send-notification.js";
import type { ListCampaignsUseCase } from "../application/list-campaigns.js";
import type { GetCampaignUseCase } from "../application/get-campaign.js";
import type { DeleteCampaignUseCase } from "../application/delete-campaign.js";
import { DomainError } from "@/shared/errors/domain-error.js";
import {
  campaignIdParams,
  orgAdminSendBody,
  staffSendBody,
} from "./notification-schemas.js";

interface Deps {
  send: SendNotificationUseCase;
  listCampaigns: ListCampaignsUseCase;
  getCampaign: GetCampaignUseCase;
  deleteCampaign: DeleteCampaignUseCase;
}

/**
 * Controller usado por dois roles distintos:
 *  - Staff (sender role "staff"): rotas em /api/kintal/notifications,
 *    audiência ampla.
 *  - Org admin (sender role "org_admin"): rotas em /api/analytics/
 *    notifications, audiência fixada em "membros da própria org".
 *
 * O `senderRole` e org context são fixados a partir do `req.auth` —
 * payload nunca define quem é o sender (anti-spoofing).
 */
export class NotificationSenderController {
  constructor(private readonly deps: Deps) {}

  // ───── staff ────────────────────────────────────────────────

  sendAsStaff: RequestHandler = async (req, res, next) => {
    try {
      const body = staffSendBody.parse(req.body);
      const result = await this.deps.send.execute({
        title: body.title,
        body: body.body,
        severity: body.severity,
        link: body.link ?? null,
        audience: body.audience,
        sender: {
          role: "staff",
          userId: req.auth!.realUserId,
          orgId: null,
        },
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listCampaignsAsStaff: RequestHandler = async (_req, res, next) => {
    try {
      const items = await this.deps.listCampaigns.execute();
      res.json({ data: { campaigns: items } });
    } catch (err) {
      next(err);
    }
  };

  getCampaignAsStaff: RequestHandler = async (req, res, next) => {
    try {
      const { campaignId } = campaignIdParams.parse(req.params);
      const detail = await this.deps.getCampaign.execute({
        campaignId,
        requester: { userId: req.auth!.realUserId, role: "staff" },
      });
      res.json({ data: detail });
    } catch (err) {
      next(err);
    }
  };

  deleteCampaignAsStaff: RequestHandler = async (req, res, next) => {
    try {
      const { campaignId } = campaignIdParams.parse(req.params);
      const result = await this.deps.deleteCampaign.execute({
        campaignId,
        requester: { userId: req.auth!.realUserId, role: "staff" },
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // ───── org admin ────────────────────────────────────────────

  sendAsOrgAdmin: RequestHandler = async (req, res, next) => {
    try {
      const body = orgAdminSendBody.parse(req.body);
      const orgId = req.auth?.activeOrganizationId;
      if (!orgId) {
        throw new ActiveOrgRequiredError();
      }
      const result = await this.deps.send.execute({
        title: body.title,
        body: body.body,
        severity: body.severity,
        link: body.link ?? null,
        audience: { type: "org_members", organizationId: orgId },
        sender: {
          role: "org_admin",
          userId: req.auth!.realUserId,
          orgId,
        },
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listCampaignsAsOrgAdmin: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth?.activeOrganizationId;
      if (!orgId) {
        throw new ActiveOrgRequiredError();
      }
      const items = await this.deps.listCampaigns.execute({
        senderOrgId: orgId,
      });
      res.json({ data: { campaigns: items } });
    } catch (err) {
      next(err);
    }
  };

  getCampaignAsOrgAdmin: RequestHandler = async (req, res, next) => {
    try {
      const { campaignId } = campaignIdParams.parse(req.params);
      const orgId = req.auth?.activeOrganizationId;
      if (!orgId) {
        throw new ActiveOrgRequiredError();
      }
      const detail = await this.deps.getCampaign.execute({
        campaignId,
        requester: {
          userId: req.auth!.realUserId,
          role: "org_admin",
          orgId,
        },
      });
      res.json({ data: detail });
    } catch (err) {
      next(err);
    }
  };

  deleteCampaignAsOrgAdmin: RequestHandler = async (req, res, next) => {
    try {
      const { campaignId } = campaignIdParams.parse(req.params);
      const orgId = req.auth?.activeOrganizationId;
      if (!orgId) {
        throw new ActiveOrgRequiredError();
      }
      const result = await this.deps.deleteCampaign.execute({
        campaignId,
        requester: {
          userId: req.auth!.realUserId,
          role: "org_admin",
          orgId,
        },
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

class ActiveOrgRequiredError extends DomainError {
  readonly code = "ACTIVE_ORG_REQUIRED";
  readonly statusCode = 400;
  constructor() {
    super(
      "Selecione uma instituição ativa antes de enviar a notificação.",
    );
  }
}
