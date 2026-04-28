import mongoose, { Schema, type Model } from "mongoose";
import type { TopupId } from "../domain/topup.js";
import type { PixTopupIntentStatus } from "../domain/pix-topup-intent.js";

export interface PixTopupIntentDoc {
  /** Mesmo do AbacatePay (`pix_char_xxx`) — único, serve de _id natural. */
  _id: string;
  ownerId: string;
  topupId: TopupId;
  amountCents: number;
  taxId: string;
  status: PixTopupIntentStatus;
  brCode: string;
  brCodeBase64: string;
  expiresAt: Date;
  paidAt: Date | null;
  walletId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const pixTopupIntentSchema = new Schema<PixTopupIntentDoc>(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    topupId: {
      type: String,
      required: true,
      enum: ["topup_2k", "topup_5k", "topup_15k"],
    },
    amountCents: { type: Number, required: true },
    taxId: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PAID", "EXPIRED", "FAILED"],
    },
    brCode: { type: String, required: true },
    brCodeBase64: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    walletId: { type: String, default: null },
  },
  {
    collection: "pix_topup_intents",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Lookup combinado pra `findByAbacateIdAndOwner` — gating de ownership.
pixTopupIntentSchema.index({ _id: 1, ownerId: 1 });

export const PixTopupIntentModel: Model<PixTopupIntentDoc> =
  (mongoose.models.PixTopupIntent as Model<PixTopupIntentDoc> | undefined) ??
  mongoose.model<PixTopupIntentDoc>("PixTopupIntent", pixTopupIntentSchema);
