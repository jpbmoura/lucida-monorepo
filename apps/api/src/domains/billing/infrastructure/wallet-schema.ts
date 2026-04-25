import mongoose, { Schema, type Model } from "mongoose";
import type { CreditSource } from "../domain/credit-source.js";
import type { BillingScope } from "../domain/billing-scope.js";

export interface CreditWalletDoc {
  _id: string;
  /**
   * `"user"` pra wallet pessoal; `"org"` pra pool institucional. Default
   * "user" cobre docs legados sem o campo — o Mongoose preenche na leitura.
   * Debit NUNCA atravessa scopes: user debita só do próprio user; member em
   * pool debita só da org.
   */
  scope: BillingScope;
  ownerId: string;
  source: CreditSource;
  balance: number;
  expiresAt: Date | null;
  externalRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<CreditWalletDoc>(
  {
    _id: { type: String, required: true },
    scope: {
      type: String,
      required: true,
      enum: ["user", "org"],
      default: "user",
    },
    ownerId: { type: String, required: true, index: true },
    source: {
      type: String,
      required: true,
      enum: ["subscription", "topup", "welcome", "promo", "admin_grant"],
    },
    balance: { type: Number, required: true, default: 0, min: 0 },
    expiresAt: { type: Date, default: null, index: true },
    externalRef: { type: String, default: null },
  },
  {
    collection: "credit_wallets",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Lookups mais comuns: carteiras ativas de um dono ordenadas por source +
// createdAt. Scope como primeiro campo do composto isola o universo user do
// universo org em toda query — debit nunca cruza.
walletSchema.index({ scope: 1, ownerId: 1, source: 1, createdAt: 1 });

export const CreditWalletModel: Model<CreditWalletDoc> =
  (mongoose.models.CreditWallet as Model<CreditWalletDoc> | undefined) ??
  mongoose.model<CreditWalletDoc>("CreditWallet", walletSchema);
