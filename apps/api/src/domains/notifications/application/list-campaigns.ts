import type {
  ListCampaignsFilter,
  NotificationRepository,
} from "../domain/notification-repository.js";

export interface CampaignDTO {
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
  /** % de leitura (0..100) — útil pra exibir no histórico. */
  readRatePct: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class ListCampaignsUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(filter?: ListCampaignsFilter): Promise<CampaignDTO[]> {
    const summaries = await this.repo.listCampaigns({
      ...filter,
      limit: Math.min(MAX_LIMIT, filter?.limit ?? DEFAULT_LIMIT),
    });
    return summaries.map((s) => ({
      campaignId: s.campaignId,
      title: s.title,
      body: s.body,
      severity: s.severity,
      link: s.link,
      audienceLabel: s.audienceLabel,
      senderUserId: s.senderUserId,
      senderRole: s.senderRole,
      senderOrgId: s.senderOrgId,
      createdAt: s.createdAt.toISOString(),
      recipientCount: s.recipientCount,
      readCount: s.readCount,
      readRatePct:
        s.recipientCount > 0
          ? Math.round((s.readCount / s.recipientCount) * 100)
          : 0,
    }));
  }
}
