import mongoose, { Schema, type Model } from "mongoose";
import type { InvoiceSource } from "../domain/invoice-source.js";
import type { InvoiceStatus } from "../domain/invoice-status.js";
import type { TakerSnapshot } from "../domain/taker-snapshot.js";

/**
 * Documento Invoice persistido em Mongo. Campo `taker` é polimórfico
 * (PF/PJ via discriminator `type`); `Schema.Types.Mixed` aceita ambas
 * shapes sem perder validação que já fizemos no domínio.
 */
export interface InvoiceDoc {
  _id: string;
  ownerId: string;
  organizationId: string | null;
  source: InvoiceSource;
  externalRef: string;
  status: InvoiceStatus;
  taker: TakerSnapshot;
  items: Array<{
    description: string;
    amountCents: number;
    federalServiceCode: string;
    cityServiceCode: string;
  }>;
  amountCents: number;
  providerInvoiceId: string | null;
  providerStatusRaw: string | null;
  rpsNumber: string | null;
  rpsSeries: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  attempts: number;
  lastError: string | null;
  metadata: Record<string, string>;
  issuedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<InvoiceDoc>(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
    source: {
      type: String,
      required: true,
      enum: ["subscription", "topup_stripe", "topup_pix"],
    },
    // externalRef é unique — garantia final de idempotência. Se webhook
    // entrega 2x, o segundo upsert dá conflict (caller já trata).
    externalRef: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "issued", "failed", "cancelled"],
    },
    taker: { type: Schema.Types.Mixed, required: true },
    items: {
      type: [
        new Schema(
          {
            description: { type: String, required: true },
            amountCents: { type: Number, required: true },
            federalServiceCode: { type: String, required: true },
            cityServiceCode: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    amountCents: { type: Number, required: true },
    providerInvoiceId: { type: String, default: null, index: true },
    providerStatusRaw: { type: String, default: null },
    rpsNumber: { type: String, default: null },
    rpsSeries: { type: String, default: null },
    pdfUrl: { type: String, default: null },
    xmlUrl: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    issuedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  {
    collection: "invoices",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// "Notas do user, mais recentes primeiro" — query mais comum.
invoiceSchema.index({ ownerId: 1, createdAt: -1 });
// Mesma coisa no contexto org.
invoiceSchema.index({ organizationId: 1, createdAt: -1 });
// Worker pega pendentes/processing — ordenado por updatedAt pra retry justo.
invoiceSchema.index({ status: 1, updatedAt: 1 });

export const InvoiceModel: Model<InvoiceDoc> =
  (mongoose.models.Invoice as Model<InvoiceDoc> | undefined) ??
  mongoose.model<InvoiceDoc>("Invoice", invoiceSchema);
