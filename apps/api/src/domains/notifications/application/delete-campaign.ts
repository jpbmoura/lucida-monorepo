import type { NotificationRepository } from "../domain/notification-repository.js";
import {
  CampaignAccessDeniedError,
  CampaignNotFoundError,
} from "../domain/notifications-errors.js";

export interface DeleteCampaignInput {
  campaignId: string;
  requester: {
    userId: string;
    role: "staff" | "org_admin";
    orgId?: string | null;
  };
}

/**
 * Hard delete de todos os receipts de uma campanha — retração total.
 * Quem ainda não tinha aberto, perde a notificação. Quem já leu, vê sumir
 * do histórico (custo aceito conforme decisão de produto).
 *
 * Autorização: staff deleta qualquer; org_admin só do próprio org.
 */
export class DeleteCampaignUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: DeleteCampaignInput): Promise<{ deleted: number }> {
    const data = await this.repo.getCampaign(input.campaignId);
    if (!data) throw new CampaignNotFoundError();

    if (input.requester.role === "org_admin") {
      if (
        data.summary.senderOrgId !== input.requester.orgId ||
        !input.requester.orgId
      ) {
        throw new CampaignAccessDeniedError();
      }
    }

    const deleted = await this.repo.deleteCampaign(input.campaignId);
    return { deleted };
  }
}
