import type { NotificationRepository } from "../domain/notification-repository.js";
import {
  CampaignAccessDeniedError,
  CampaignNotFoundError,
} from "../domain/notifications-errors.js";

export interface GetCampaignInput {
  campaignId: string;
  /** Quem está pedindo. Usado pra autorização. */
  requester: {
    userId: string;
    role: "staff" | "org_admin";
    /** Org context quando role === "org_admin". */
    orgId?: string | null;
  };
}

export interface CampaignReceiptDTO {
  recipientUserId: string;
  readAt: string | null;
  dismissedAt: string | null;
}

export interface CampaignDetailDTO {
  campaignId: string;
  title: string;
  body: string;
  severity: string;
  link: string | null;
  audienceLabel: string;
  senderUserId: string;
  senderRole: string;
  senderOrgId: string | null;
  createdAt: string;
  recipientCount: number;
  readCount: number;
  receipts: CampaignReceiptDTO[];
}

/**
 * Detalhe da campanha. Staff vê qualquer uma; org_admin só as suas
 * (mesmo senderOrgId). Falha 403 se cruzar fronteira.
 */
export class GetCampaignUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: GetCampaignInput): Promise<CampaignDetailDTO> {
    const data = await this.repo.getCampaign(input.campaignId);
    if (!data) throw new CampaignNotFoundError();

    if (input.requester.role === "org_admin") {
      // Org admin só pode ver campanha que sua org enviou.
      if (
        data.summary.senderOrgId !== input.requester.orgId ||
        !input.requester.orgId
      ) {
        throw new CampaignAccessDeniedError();
      }
    }

    return {
      campaignId: data.summary.campaignId,
      title: data.summary.title,
      body: data.summary.body,
      severity: data.summary.severity,
      link: data.summary.link,
      audienceLabel: data.summary.audienceLabel,
      senderUserId: data.summary.senderUserId,
      senderRole: data.summary.senderRole,
      senderOrgId: data.summary.senderOrgId,
      createdAt: data.summary.createdAt.toISOString(),
      recipientCount: data.summary.recipientCount,
      readCount: data.summary.readCount,
      receipts: data.receipts.map((r) => ({
        recipientUserId: r.recipientUserId,
        readAt: r.readAt?.toISOString() ?? null,
        dismissedAt: r.dismissedAt?.toISOString() ?? null,
      })),
    };
  }
}
