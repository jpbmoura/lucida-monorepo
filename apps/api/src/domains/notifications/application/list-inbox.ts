import type {
  InboxFilter,
  NotificationRepository,
} from "../domain/notification-repository.js";
import type { Notification } from "../domain/notification.js";

export interface InboxItemDTO {
  id: string;
  title: string;
  body: string;
  severity: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  senderRole: string;
  audienceLabel: string;
}

export interface ListInboxInput {
  recipientUserId: string;
  filter?: InboxFilter;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class ListInboxUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: ListInboxInput): Promise<InboxItemDTO[]> {
    const filter: InboxFilter = {
      ...input.filter,
      limit: Math.min(MAX_LIMIT, input.filter?.limit ?? DEFAULT_LIMIT),
    };
    const items = await this.repo.listForRecipient(
      input.recipientUserId,
      filter,
    );
    return items.map(toDTO);
  }
}

export function toDTO(n: Notification): InboxItemDTO {
  return {
    id: n.id.toString(),
    title: n.title,
    body: n.body,
    severity: n.severity,
    link: n.link,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
    senderRole: n.senderRole,
    audienceLabel: n.audienceLabel,
  };
}
