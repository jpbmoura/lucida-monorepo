import mongoose, { Schema, type Model } from "mongoose";
import type { OrgBillingMode } from "../domain/billing-mode.js";

export interface OrganizationBillingSettingsDoc {
  _id: string; // mesmo hex do organization._id pra facilitar lookup
  organizationId: string;
  billingMode: OrgBillingMode;
  perTeacherLimit: number | null;
  billingCycle: "monthly" | "weekly" | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<OrganizationBillingSettingsDoc>(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true, unique: true, index: true },
    billingMode: {
      type: String,
      required: true,
      enum: ["pool", "per_teacher", "pay_per_use"],
      default: "pool",
    },
    perTeacherLimit: { type: Number, default: null },
    billingCycle: {
      type: String,
      enum: ["monthly", "weekly", null],
      default: null,
    },
    stripeSubscriptionId: { type: String, default: null },
  },
  {
    collection: "organization_billing_settings",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

export const OrganizationBillingSettingsModel: Model<OrganizationBillingSettingsDoc> =
  (mongoose.models.OrganizationBillingSettings as
    | Model<OrganizationBillingSettingsDoc>
    | undefined) ??
  mongoose.model<OrganizationBillingSettingsDoc>(
    "OrganizationBillingSettings",
    settingsSchema,
  );
