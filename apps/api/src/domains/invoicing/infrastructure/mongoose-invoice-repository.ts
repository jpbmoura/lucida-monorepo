import { randomUUID } from "node:crypto";
import { InvoiceId } from "../domain/invoice-id.js";
import { Invoice } from "../domain/invoice.js";
import type {
  InvoiceRepository,
  ListInvoicesOptions,
} from "../domain/invoice-repository.js";
import { InvoiceModel, type InvoiceDoc } from "./invoice-schema.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class MongooseInvoiceRepository implements InvoiceRepository {
  nextId(): InvoiceId {
    return InvoiceId.of(randomUUID());
  }

  async save(invoice: Invoice): Promise<void> {
    await InvoiceModel.updateOne(
      { _id: invoice.id.toString() },
      {
        $set: {
          ownerId: invoice.ownerId,
          organizationId: invoice.organizationId,
          source: invoice.source,
          externalRef: invoice.externalRef,
          status: invoice.status,
          taker: invoice.taker,
          items: invoice.items,
          amountCents: invoice.amountCents,
          providerInvoiceId: invoice.providerInvoiceId,
          providerStatusRaw: invoice.providerStatusRaw,
          rpsNumber: invoice.rpsNumber,
          rpsSeries: invoice.rpsSeries,
          pdfUrl: invoice.pdfUrl,
          xmlUrl: invoice.xmlUrl,
          attempts: invoice.attempts,
          lastError: invoice.lastError,
          metadata: invoice.metadata,
          issuedAt: invoice.issuedAt,
          cancelledAt: invoice.cancelledAt,
        },
        $setOnInsert: { _id: invoice.id.toString() },
      },
      { upsert: true },
    );
  }

  async findById(id: InvoiceId): Promise<Invoice | null> {
    const doc = await InvoiceModel.findById(id.toString())
      .lean<InvoiceDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByExternalRef(externalRef: string): Promise<Invoice | null> {
    const doc = await InvoiceModel.findOne({ externalRef })
      .lean<InvoiceDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByProviderInvoiceId(
    providerInvoiceId: string,
  ): Promise<Invoice | null> {
    const doc = await InvoiceModel.findOne({ providerInvoiceId })
      .lean<InvoiceDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOwner(
    ownerId: string,
    opts: ListInvoicesOptions = {},
  ): Promise<Invoice[]> {
    const limit = clampLimit(opts.limit);
    const filter: Record<string, unknown> = { ownerId };
    if (opts.before) filter.createdAt = { $lt: opts.before };
    const docs = await InvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<InvoiceDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async findByOrganization(
    organizationId: string,
    opts: ListInvoicesOptions = {},
  ): Promise<Invoice[]> {
    const limit = clampLimit(opts.limit);
    const filter: Record<string, unknown> = { organizationId };
    if (opts.before) filter.createdAt = { $lt: opts.before };
    const docs = await InvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<InvoiceDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async findPendingForProcessing(opts: {
    limit: number;
    staleProcessingAfter?: Date;
  }): Promise<Invoice[]> {
    const limit = clampLimit(opts.limit);
    // pending: enviar pra primeira vez. processing antigo: provavelmente
    // perdemos o webhook — reconsultar via getInvoice.
    const staleThreshold =
      opts.staleProcessingAfter ?? new Date(Date.now() - 5 * 60 * 1000);
    const docs = await InvoiceModel.find({
      $or: [
        { status: "pending" },
        { status: "processing", updatedAt: { $lt: staleThreshold } },
      ],
    })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .lean<InvoiceDoc[]>()
      .exec();
    return docs.map(toEntity);
  }
}

function clampLimit(raw: number | undefined): number {
  if (!raw || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

function toEntity(doc: InvoiceDoc): Invoice {
  return Invoice.restore({
    id: InvoiceId.of(doc._id),
    ownerId: doc.ownerId,
    organizationId: doc.organizationId,
    source: doc.source,
    externalRef: doc.externalRef,
    status: doc.status,
    taker: doc.taker,
    items: doc.items,
    amountCents: doc.amountCents,
    providerInvoiceId: doc.providerInvoiceId,
    providerStatusRaw: doc.providerStatusRaw,
    rpsNumber: doc.rpsNumber,
    rpsSeries: doc.rpsSeries,
    pdfUrl: doc.pdfUrl,
    xmlUrl: doc.xmlUrl,
    attempts: doc.attempts,
    lastError: doc.lastError,
    metadata: doc.metadata ?? {},
    issuedAt: doc.issuedAt,
    cancelledAt: doc.cancelledAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
