import mongoose, { Schema, type Model } from "mongoose";
import type { TicketOrigin } from "../domain/ticket-origin.js";
import type { TicketStatus } from "../domain/ticket-status.js";
import type {
  TicketMessageDirection,
  TicketMessageKind,
} from "../domain/ticket-message.js";

/**
 * Documento Ticket. Mensagens vivem aninhadas — volume é baixo (poucos
 * tickets/dia, poucas msgs por ticket) e queries comuns precisam delas.
 * Index em `messages.providerMessageId` é parcial pra permitir múltiplas
 * mensagens com null.
 */

interface TicketMessageDoc {
  id: string;
  direction: TicketMessageDirection;
  kind: TicketMessageKind;
  fromEmail: string;
  fromName: string | null;
  bodyText: string;
  bodyHtml: string | null;
  providerMessageId: string | null;
  inReplyTo: string | null;
  attachments: Array<{
    filename: string;
    size: number;
    contentType: string;
    providerUrl: string;
  }>;
  createdAt: Date;
}

export interface TicketDoc {
  _id: string;
  subject: string;
  status: TicketStatus;
  customerEmail: string;
  customerName: string | null;
  userId: string | null;
  origin: TicketOrigin;
  messages: TicketMessageDoc[];
  doneAt: Date | null;
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ticketAttachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    size: { type: Number, required: true },
    contentType: { type: String, required: true },
    providerUrl: { type: String, required: true },
  },
  { _id: false },
);

const ticketMessageSchema = new Schema<TicketMessageDoc>(
  {
    id: { type: String, required: true },
    direction: {
      type: String,
      required: true,
      enum: ["inbound", "outbound"],
    },
    kind: {
      type: String,
      required: true,
      enum: ["manual", "auto"],
      default: "manual",
    },
    fromEmail: { type: String, required: true },
    fromName: { type: String, default: null },
    bodyText: { type: String, required: true },
    bodyHtml: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    inReplyTo: { type: String, default: null },
    attachments: { type: [ticketAttachmentSchema], default: [] },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const ticketSchema = new Schema<TicketDoc>(
  {
    _id: { type: String, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["new", "in_progress", "done"],
      index: true,
    },
    customerEmail: { type: String, required: true, index: true },
    customerName: { type: String, default: null },
    userId: { type: String, default: null, index: true },
    origin: {
      type: String,
      required: true,
      enum: ["email", "form"],
    },
    messages: { type: [ticketMessageSchema], default: [] },
    doneAt: { type: Date, default: null },
    lastInboundAt: { type: Date, default: null },
    lastOutboundAt: { type: Date, default: null },
  },
  {
    collection: "tickets",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Lista por status, mais recentes primeiro (query principal Kintal).
ticketSchema.index({ status: 1, updatedAt: -1 });
// Threading via lookup por providerMessageId de mensagem outbound.
ticketSchema.index({ "messages.providerMessageId": 1 });

export const TicketModel: Model<TicketDoc> =
  (mongoose.models.Ticket as Model<TicketDoc> | undefined) ??
  mongoose.model<TicketDoc>("Ticket", ticketSchema);
