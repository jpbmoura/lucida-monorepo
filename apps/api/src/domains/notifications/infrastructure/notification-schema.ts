import mongoose, { Schema, type Model } from "mongoose";
import { SEVERITIES, type Severity } from "../domain/severity.js";
import type { SenderRole } from "../domain/notification.js";

export interface NotificationDoc {
  _id: string;
  recipientUserId: string;
  title: string;
  body: string;
  severity: Severity;
  link: string | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  senderRole: SenderRole;
  senderUserId: string;
  senderOrgId: string | null;
  campaignId: string;
  audienceLabel: string;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    _id: { type: String, required: true },
    recipientUserId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    severity: {
      type: String,
      required: true,
      enum: [...SEVERITIES],
      default: "info",
    },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
    senderRole: {
      type: String,
      required: true,
      enum: ["staff", "org_admin", "system"],
    },
    senderUserId: { type: String, required: true, index: true },
    senderOrgId: { type: String, default: null, index: true },
    campaignId: { type: String, required: true, index: true },
    audienceLabel: { type: String, required: true },
    createdAt: { type: Date, required: true, index: true },
  },
  {
    collection: "notifications",
    timestamps: false,
    _id: false,
    versionKey: false,
  },
);

// Inbox query: receiver + dismissedAt + readAt + createdAt desc.
notificationSchema.index({
  recipientUserId: 1,
  dismissedAt: 1,
  createdAt: -1,
});

// Campaign aggregation.
notificationSchema.index({ campaignId: 1 });

export const NotificationModel: Model<NotificationDoc> =
  (mongoose.models.Notification as Model<NotificationDoc> | undefined) ??
  mongoose.model<NotificationDoc>("Notification", notificationSchema);
