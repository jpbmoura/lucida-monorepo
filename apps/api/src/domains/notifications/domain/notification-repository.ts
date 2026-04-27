import type { Notification } from "./notification.js";
import type { NotificationId } from "./notification-id.js";

export interface InboxFilter {
  /** Quando true, inclui receipts dispensados (default false). */
  includeDismissed?: boolean;
  /** Quando true, retorna só não-lidos (default false). */
  unreadOnly?: boolean;
  limit?: number;
  /** Cursor — createdAt do último item da página anterior. */
  before?: Date;
}

export interface CampaignSummary {
  campaignId: string;
  title: string;
  body: string;
  severity: string;
  link: string | null;
  audienceLabel: string;
  senderUserId: string;
  senderRole: string;
  senderOrgId: string | null;
  createdAt: Date;
  recipientCount: number;
  readCount: number;
}

export interface ListCampaignsFilter {
  /** Quando definido, lista só campanhas desse senderUserId. */
  senderUserId?: string;
  /** Quando definido, lista só campanhas com esse senderOrgId. */
  senderOrgId?: string;
  limit?: number;
}

export interface NotificationRepository {
  nextId(): NotificationId;
  /** Bulk insert eficiente — usado no fanout do send. */
  bulkInsert(notifications: Notification[]): Promise<void>;
  save(notification: Notification): Promise<void>;
  findById(id: NotificationId): Promise<Notification | null>;

  /** Inbox de um receiver. */
  listForRecipient(
    recipientUserId: string,
    filter?: InboxFilter,
  ): Promise<Notification[]>;

  /** Count de não-lidos não-dispensados — alimenta o badge da bell. */
  countUnreadForRecipient(recipientUserId: string): Promise<number>;

  /** Marca todas como lidas (não-dispensadas). */
  markAllAsReadForRecipient(recipientUserId: string): Promise<number>;

  /** Lista campanhas agrupadas. Aceita filtros pra histórico próprio. */
  listCampaigns(filter?: ListCampaignsFilter): Promise<CampaignSummary[]>;

  /** Detalhes de 1 campanha + receipts (quem leu, quem não). */
  getCampaign(campaignId: string): Promise<{
    summary: CampaignSummary;
    receipts: Notification[];
  } | null>;

  /** Hard delete de todos os receipts de uma campanha. */
  deleteCampaign(campaignId: string): Promise<number>;
}
