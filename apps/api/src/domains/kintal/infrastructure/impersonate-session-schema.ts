import mongoose, { Schema, type Model } from "mongoose";
import type { ImpersonateStopReason } from "../domain/impersonate-session.js";

export interface ImpersonateSessionDoc {
  _id: string;
  staffUserId: string;
  targetUserId: string;
  startedAt: Date;
  stoppedAt: Date | null;
  stopReason: ImpersonateStopReason | null;
  userAgent: string | null;
  ipAddress: string | null;
}

const impersonateSessionSchema = new Schema<ImpersonateSessionDoc>(
  {
    _id: { type: String, required: true },
    staffUserId: { type: String, required: true, index: true },
    targetUserId: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true, index: true },
    stoppedAt: { type: Date, default: null },
    stopReason: {
      type: String,
      enum: ["manual", "expired", "superseded"],
      default: null,
    },
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
  },
  {
    collection: "impersonate_sessions",
    timestamps: false,
    _id: false,
    versionKey: false,
  },
);

// Lookup da sessão aberta do staff: filtra `staffUserId + stoppedAt: null`.
impersonateSessionSchema.index({ staffUserId: 1, stoppedAt: 1 });

export const ImpersonateSessionModel: Model<ImpersonateSessionDoc> =
  (mongoose.models.ImpersonateSession as
    | Model<ImpersonateSessionDoc>
    | undefined) ??
  mongoose.model<ImpersonateSessionDoc>(
    "ImpersonateSession",
    impersonateSessionSchema,
  );
