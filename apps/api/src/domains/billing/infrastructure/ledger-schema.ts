import mongoose, { Schema, type Model } from "mongoose";
import type {
  LedgerReason,
  LedgerType,
} from "../domain/ledger-entry.js";
import type { BillingScope } from "../domain/billing-scope.js";

export interface LedgerEntryDoc {
  _id: string;
  /** `"user"` pra ledger de user; `"org"` pra ledger da instituição. */
  scope: BillingScope;
  ownerId: string;
  /**
   * Ator humano que disparou a ação. Relevante em scope=org: quando o
   * professor X consome do pool, a entry fica
   * `{ scope: "org", ownerId: orgId, actorUserId: X }` — preserva quem
   * consumiu o quê pra o dashboard por professor. Em scope=user, em geral
   * igual ao `ownerId`, mas pode ser null quando a movimentação não tem
   * ator humano (ex: renewal Stripe).
   */
  actorUserId: string | null;
  walletId: string;
  walletSource: string;
  type: LedgerType;
  amount: number;
  reason: LedgerReason;
  relatedAction: string | null;
  tokensUsed: number | null;
  /**
   * ID do período de cobrança (pay_per_use futuro). Null em prepaid: cada
   * entry fica "solta" no tempo. O cron de billing preenche isso em
   * lançamentos pay_per_use pra emitir fatura consolidada.
   */
  billingPeriodId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const ledgerSchema = new Schema<LedgerEntryDoc>(
  {
    _id: { type: String, required: true },
    scope: {
      type: String,
      required: true,
      enum: ["user", "org"],
      default: "user",
    },
    ownerId: { type: String, required: true, index: true },
    actorUserId: { type: String, default: null },
    walletId: { type: String, required: true, index: true },
    walletSource: { type: String, required: true },
    type: { type: String, required: true, enum: ["credit", "debit"] },
    amount: { type: Number, required: true, min: 1 },
    reason: {
      type: String,
      required: true,
      enum: [
        "welcome_bonus",
        "subscription_renewal",
        "topup_purchase",
        "promo_grant",
        "ai_consumption",
        "expiration",
        "refund",
        "adjustment",
        "admin_grant",
      ],
    },
    relatedAction: { type: String, default: null },
    tokensUsed: { type: Number, default: null },
    billingPeriodId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, required: true, index: true },
  },
  {
    collection: "credit_ledger",
    timestamps: false,
    _id: false,
    versionKey: false,
  },
);

// Extrato ordenado por createdAt desc. Scope primeiro isola os universos.
ledgerSchema.index({ scope: 1, ownerId: 1, createdAt: -1 });

export const LedgerEntryModel: Model<LedgerEntryDoc> =
  (mongoose.models.LedgerEntry as Model<LedgerEntryDoc> | undefined) ??
  mongoose.model<LedgerEntryDoc>("LedgerEntry", ledgerSchema);
