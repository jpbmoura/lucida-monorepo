import { randomUUID } from "node:crypto";
import { Notification } from "../domain/notification.js";
import { NotificationId } from "../domain/notification-id.js";
import type {
  CampaignSummary,
  InboxFilter,
  ListCampaignsFilter,
  NotificationRepository,
} from "../domain/notification-repository.js";
import { isSeverity } from "../domain/severity.js";
import {
  NotificationModel,
  type NotificationDoc,
} from "./notification-schema.js";

export class MongooseNotificationRepository implements NotificationRepository {
  nextId(): NotificationId {
    return NotificationId.of(randomUUID());
  }

  async bulkInsert(notifications: Notification[]): Promise<void> {
    if (notifications.length === 0) return;
    const docs = notifications.map(toDoc);
    // ordered:false continua mesmo se 1 doc falhar — fanout grande não
    // pode quebrar inteiro por causa de 1 receipt com problema.
    await NotificationModel.insertMany(docs, { ordered: false });
  }

  async save(n: Notification): Promise<void> {
    await NotificationModel.updateOne(
      { _id: n.id.toString() },
      {
        $set: {
          recipientUserId: n.recipientUserId,
          title: n.title,
          body: n.body,
          severity: n.severity,
          link: n.link,
          readAt: n.readAt,
          dismissedAt: n.dismissedAt,
          senderRole: n.senderRole,
          senderUserId: n.senderUserId,
          senderOrgId: n.senderOrgId,
          campaignId: n.campaignId,
          audienceLabel: n.audienceLabel,
          createdAt: n.createdAt,
        },
        $setOnInsert: { _id: n.id.toString() },
      },
      { upsert: true },
    );
  }

  async findById(id: NotificationId): Promise<Notification | null> {
    const doc = await NotificationModel.findById(id.toString())
      .lean<NotificationDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async listForRecipient(
    recipientUserId: string,
    filter: InboxFilter = {},
  ): Promise<Notification[]> {
    const mongoFilter: Record<string, unknown> = { recipientUserId };
    if (!filter.includeDismissed) {
      mongoFilter.dismissedAt = null;
    }
    if (filter.unreadOnly) {
      mongoFilter.readAt = null;
    }
    if (filter.before) {
      mongoFilter.createdAt = { $lt: filter.before };
    }
    const docs = await NotificationModel.find(mongoFilter)
      .sort({ createdAt: -1 })
      .limit(filter.limit ?? 50)
      .lean<NotificationDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  countUnreadForRecipient(recipientUserId: string): Promise<number> {
    return NotificationModel.countDocuments({
      recipientUserId,
      readAt: null,
      dismissedAt: null,
    }).exec();
  }

  async markAllAsReadForRecipient(recipientUserId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { recipientUserId, readAt: null, dismissedAt: null },
      { $set: { readAt: new Date() } },
    );
    return result.modifiedCount ?? 0;
  }

  async listCampaigns(
    filter: ListCampaignsFilter = {},
  ): Promise<CampaignSummary[]> {
    const match: Record<string, unknown> = {};
    if (filter.senderUserId) match.senderUserId = filter.senderUserId;
    if (filter.senderOrgId) match.senderOrgId = filter.senderOrgId;

    // Agrupa por campaignId: pega 1 receipt como template (qualquer um
    // serve, todos têm o mesmo conteúdo) + soma counts.
    const rows = await NotificationModel.aggregate<{
      _id: string;
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
    }>([
      { $match: match },
      {
        $group: {
          _id: "$campaignId",
          title: { $first: "$title" },
          body: { $first: "$body" },
          severity: { $first: "$severity" },
          link: { $first: "$link" },
          audienceLabel: { $first: "$audienceLabel" },
          senderUserId: { $first: "$senderUserId" },
          senderRole: { $first: "$senderRole" },
          senderOrgId: { $first: "$senderOrgId" },
          createdAt: { $first: "$createdAt" },
          recipientCount: { $sum: 1 },
          readCount: {
            $sum: { $cond: [{ $ne: ["$readAt", null] }, 1, 0] },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: filter.limit ?? 50 },
    ]).exec();

    return rows.map((r) => ({
      campaignId: r._id,
      title: r.title,
      body: r.body,
      severity: r.severity,
      link: r.link,
      audienceLabel: r.audienceLabel,
      senderUserId: r.senderUserId,
      senderRole: r.senderRole,
      senderOrgId: r.senderOrgId,
      createdAt: r.createdAt,
      recipientCount: r.recipientCount,
      readCount: r.readCount,
    }));
  }

  async getCampaign(campaignId: string): Promise<{
    summary: CampaignSummary;
    receipts: Notification[];
  } | null> {
    const docs = await NotificationModel.find({ campaignId })
      .sort({ createdAt: 1 })
      .lean<NotificationDoc[]>()
      .exec();
    if (docs.length === 0) return null;

    const first = docs[0]!;
    const readCount = docs.filter((d) => d.readAt !== null).length;

    const summary: CampaignSummary = {
      campaignId,
      title: first.title,
      body: first.body,
      severity: first.severity,
      link: first.link,
      audienceLabel: first.audienceLabel,
      senderUserId: first.senderUserId,
      senderRole: first.senderRole,
      senderOrgId: first.senderOrgId,
      createdAt: first.createdAt,
      recipientCount: docs.length,
      readCount,
    };

    return {
      summary,
      receipts: docs.map(toEntity),
    };
  }

  async deleteCampaign(campaignId: string): Promise<number> {
    const result = await NotificationModel.deleteMany({ campaignId });
    return result.deletedCount ?? 0;
  }
}

function toDoc(n: Notification): NotificationDoc {
  return {
    _id: n.id.toString(),
    recipientUserId: n.recipientUserId,
    title: n.title,
    body: n.body,
    severity: n.severity,
    link: n.link,
    readAt: n.readAt,
    dismissedAt: n.dismissedAt,
    senderRole: n.senderRole,
    senderUserId: n.senderUserId,
    senderOrgId: n.senderOrgId,
    campaignId: n.campaignId,
    audienceLabel: n.audienceLabel,
    createdAt: n.createdAt,
  };
}

function toEntity(doc: NotificationDoc): Notification {
  // Defesa contra docs com severity legacy/desconhecido.
  const severity = isSeverity(doc.severity) ? doc.severity : "info";
  return Notification.restore({
    id: NotificationId.of(doc._id),
    recipientUserId: doc.recipientUserId,
    title: doc.title,
    body: doc.body,
    severity,
    link: doc.link,
    readAt: doc.readAt,
    dismissedAt: doc.dismissedAt,
    senderRole: doc.senderRole,
    senderUserId: doc.senderUserId,
    senderOrgId: doc.senderOrgId,
    campaignId: doc.campaignId,
    audienceLabel: doc.audienceLabel,
    createdAt: doc.createdAt,
  });
}
