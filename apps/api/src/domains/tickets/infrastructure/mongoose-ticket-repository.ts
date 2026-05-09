import { randomUUID } from "node:crypto";
import { Ticket } from "../domain/ticket.js";
import { TicketId } from "../domain/ticket-id.js";
import { TicketMessage } from "../domain/ticket-message.js";
import type {
  CountsByBox,
  ListTicketsOptions,
  TicketBox,
  TicketRepository,
} from "../domain/ticket-repository.js";
import { TicketModel, type TicketDoc } from "./ticket-schema.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const INBOX_ORIGINS = ["email", "form"] as const;
const OUTBOX_ORIGINS = ["staff"] as const;

export class MongooseTicketRepository implements TicketRepository {
  nextId(): TicketId {
    return TicketId.of(randomUUID());
  }

  nextMessageId(): string {
    return randomUUID();
  }

  async save(ticket: Ticket): Promise<void> {
    await TicketModel.updateOne(
      { _id: ticket.id.toString() },
      {
        $set: {
          subject: ticket.subject,
          status: ticket.status,
          customerEmail: ticket.customerEmail,
          customerName: ticket.customerName,
          userId: ticket.userId,
          origin: ticket.origin,
          messages: ticket.messages.map((m) => ({
            id: m.id,
            direction: m.direction,
            kind: m.kind,
            fromEmail: m.fromEmail,
            fromName: m.fromName,
            bodyText: m.bodyText,
            bodyHtml: m.bodyHtml,
            providerMessageId: m.providerMessageId,
            inReplyTo: m.inReplyTo,
            attachments: m.attachments,
            createdAt: m.createdAt,
          })),
          doneAt: ticket.doneAt,
          lastInboundAt: ticket.lastInboundAt,
          lastOutboundAt: ticket.lastOutboundAt,
        },
        $setOnInsert: { _id: ticket.id.toString() },
      },
      { upsert: true },
    );
  }

  async findById(id: TicketId): Promise<Ticket | null> {
    const doc = await TicketModel.findById(id.toString())
      .lean<TicketDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOutboundMessageId(messageId: string): Promise<Ticket | null> {
    const doc = await TicketModel.findOne({
      "messages.providerMessageId": messageId,
    })
      .lean<TicketDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async list(opts: ListTicketsOptions = {}): Promise<Ticket[]> {
    const limit = clampLimit(opts.limit);
    const filter: Record<string, unknown> = {};
    if (opts.status) filter.status = opts.status;
    if (opts.box) filter.origin = { $in: originsForBox(opts.box) };
    if (opts.before) filter.updatedAt = { $lt: opts.before };
    const docs = await TicketModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean<TicketDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async findRecentByCustomerEmail(input: {
    email: string;
    excludeId: TicketId;
    limit: number;
  }): Promise<Ticket[]> {
    const docs = await TicketModel.find({
      customerEmail: input.email.toLowerCase(),
      _id: { $ne: input.excludeId.toString() },
    })
      .sort({ updatedAt: -1 })
      .limit(Math.max(1, Math.min(input.limit, 20)))
      .lean<TicketDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async countByBoxAndStatus(): Promise<CountsByBox> {
    // Agrega num só round-trip pra evitar 6 queries.
    const rows = await TicketModel.aggregate<{
      _id: { box: TicketBox; status: TicketDoc["status"] };
      count: number;
    }>([
      {
        $project: {
          status: 1,
          box: {
            $cond: [
              { $in: ["$origin", [...OUTBOX_ORIGINS]] },
              "outbox",
              "inbox",
            ],
          },
        },
      },
      { $group: { _id: { box: "$box", status: "$status" }, count: { $sum: 1 } } },
    ]).exec();

    const counts: CountsByBox = {
      inbox: { new: 0, in_progress: 0, done: 0, read: 0 },
      outbox: { new: 0, in_progress: 0, done: 0, read: 0 },
    };
    for (const row of rows) {
      const { box, status } = row._id;
      if (counts[box]) counts[box][status] = row.count;
    }
    return counts;
  }
}

function clampLimit(raw: number | undefined): number {
  if (!raw || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

function originsForBox(box: TicketBox): readonly string[] {
  return box === "outbox" ? OUTBOX_ORIGINS : INBOX_ORIGINS;
}

function toEntity(doc: TicketDoc): Ticket {
  return Ticket.restore({
    id: TicketId.of(doc._id),
    subject: doc.subject,
    status: doc.status,
    customerEmail: doc.customerEmail,
    customerName: doc.customerName,
    userId: doc.userId,
    origin: doc.origin,
    messages: (doc.messages ?? []).map((m) =>
      TicketMessage.restore({
        id: m.id,
        direction: m.direction,
        kind: m.kind,
        fromEmail: m.fromEmail,
        fromName: m.fromName,
        bodyText: m.bodyText,
        bodyHtml: m.bodyHtml,
        providerMessageId: m.providerMessageId,
        inReplyTo: m.inReplyTo,
        attachments: m.attachments ?? [],
        createdAt: m.createdAt,
      }),
    ),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    doneAt: doc.doneAt,
    lastInboundAt: doc.lastInboundAt,
    lastOutboundAt: doc.lastOutboundAt,
  });
}
