import mongoose, { Schema, type Model } from "mongoose";
import type { PlanId } from "../domain/plan.js";
import type { SubscriptionStatus } from "../domain/subscription.js";

export interface SubscriptionDoc {
  _id: string;
  ownerId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<SubscriptionDoc>(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    planId: {
      type: String,
      required: true,
      enum: ["basic_monthly", "basic_yearly", "pro_monthly", "pro_yearly"],
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "past_due", "canceled", "paused"],
    },
    stripeSubscriptionId: { type: String, required: true, unique: true },
    stripeCustomerId: { type: String, required: true, index: true },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
  },
  {
    collection: "subscriptions",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Busca "assinatura ativa do user" — active|past_due.
subscriptionSchema.index({ ownerId: 1, status: 1 });

export const SubscriptionModel: Model<SubscriptionDoc> =
  (mongoose.models.Subscription as Model<SubscriptionDoc> | undefined) ??
  mongoose.model<SubscriptionDoc>("Subscription", subscriptionSchema);
