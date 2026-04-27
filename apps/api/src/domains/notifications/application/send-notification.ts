import { randomUUID } from "node:crypto";
import { Notification } from "../domain/notification.js";
import type { NotificationRepository } from "../domain/notification-repository.js";
import type { Severity } from "../domain/severity.js";
import type { SenderRole } from "../domain/notification.js";
import type {
  AudienceDescriptor,
  AudienceResolver,
} from "./ports/audience-resolver.js";
import { EmptyAudienceError } from "../domain/notifications-errors.js";

export interface SendNotificationInput {
  title: string;
  body: string;
  severity: Severity;
  link?: string | null;
  audience: AudienceDescriptor;
  sender: {
    role: SenderRole;
    userId: string;
    /** Org context obrigatório quando role === "org_admin". */
    orgId?: string | null;
  };
  /**
   * Se true, exclui o próprio sender da audiência resolvida — útil quando
   * sender broadcast pra "todos" mas não quer receber a própria mensagem.
   * Default true.
   */
  excludeSelf?: boolean;
}

export interface SendNotificationResult {
  campaignId: string;
  recipientCount: number;
  audienceLabel: string;
}

/**
 * Resolve audiência → cria 1 receipt por destinatário (fanout) → bulk
 * insert. Retorna campaignId pra chamada poder consultar depois.
 *
 * Falha com EmptyAudienceError se audiência resolveu pra zero pessoas —
 * evita "envios fantasma" e dá feedback claro ao sender.
 */
export class SendNotificationUseCase {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly resolver: AudienceResolver,
  ) {}

  async execute(input: SendNotificationInput): Promise<SendNotificationResult> {
    const resolved = await this.resolver.resolve(input.audience);
    const excludeSelf = input.excludeSelf ?? true;

    const recipients = excludeSelf
      ? resolved.recipientUserIds.filter((id) => id !== input.sender.userId)
      : resolved.recipientUserIds;

    if (recipients.length === 0) {
      throw new EmptyAudienceError();
    }

    const campaignId = randomUUID();
    const now = new Date();

    const notifications = recipients.map((userId) =>
      Notification.create({
        id: this.repo.nextId(),
        recipientUserId: userId,
        title: input.title,
        body: input.body,
        severity: input.severity,
        link: input.link ?? null,
        senderRole: input.sender.role,
        senderUserId: input.sender.userId,
        senderOrgId: input.sender.orgId ?? null,
        campaignId,
        audienceLabel: resolved.label,
        now,
      }),
    );

    await this.repo.bulkInsert(notifications);

    return {
      campaignId,
      recipientCount: recipients.length,
      audienceLabel: resolved.label,
    };
  }
}
