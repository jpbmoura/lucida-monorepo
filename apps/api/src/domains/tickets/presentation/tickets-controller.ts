import type { RequestHandler } from "express";
import { env } from "@/env.js";
import { markEventProcessed } from "@/domains/billing/infrastructure/webhook-idempotency.js";
import type { CloseTicketUseCase, ReopenTicketUseCase } from "../application/close-ticket.js";
import type { GetTicketUseCase } from "../application/get-ticket.js";
import type {
  HandleInboundEmailInput,
  HandleInboundEmailUseCase,
} from "../application/handle-inbound-email.js";
import type { ListTicketsUseCase } from "../application/list-tickets.js";
import type {
  MarkInboxReadUseCase,
  MarkInboxUnreadUseCase,
} from "../application/mark-inbox-read.js";
import type { ReplyToTicketUseCase } from "../application/reply-to-ticket.js";
import type { Ticket } from "../domain/ticket.js";
import type { TicketMessage } from "../domain/ticket-message.js";
import {
  extractInReplyTo,
  extractMessageId,
  resendInboundEventSchema,
} from "../infrastructure/resend/resend-inbound-event-schema.js";
import { verifyResendInboundWebhook } from "../infrastructure/resend/resend-inbound-verify.js";
import { listTicketsQuery, replyBody, ticketIdParam } from "./tickets-schemas.js";

interface Deps {
  /** Opcional — null quando Resend Inbound (TICKETS_INBOUND_SECRET) não configurado. */
  handleInboundEmail: HandleInboundEmailUseCase | null;
  list: ListTicketsUseCase;
  get: GetTicketUseCase;
  reply: ReplyToTicketUseCase | null;
  close: CloseTicketUseCase;
  reopen: ReopenTicketUseCase;
  markRead: MarkInboxReadUseCase;
  markUnread: MarkInboxUnreadUseCase;
}

export class TicketsController {
  constructor(private readonly deps: Deps) {}

  /**
   * POST /v1/tickets/inbound
   * Webhook Resend Inbound. Body bruto (Buffer), assinado via Svix.
   * Sempre 200 quando assinatura bate (evita reentregas em loop por
   * bug nosso); 4xx só pra problema do remetente.
   */
  inboundWebhook: RequestHandler = async (req, res) => {
    if (!env.TICKETS_INBOUND_SECRET || !this.deps.handleInboundEmail) {
      res.status(503).end();
      return;
    }

    const body = req.body as Buffer | undefined;
    if (!body || !Buffer.isBuffer(body)) {
      res.status(400).json({ error: "Raw body missing." });
      return;
    }

    const ok = verifyResendInboundWebhook(
      body,
      req.headers,
      env.TICKETS_INBOUND_SECRET,
    );
    if (!ok) {
      res.status(401).json({ error: "Invalid signature." });
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(body.toString("utf-8"));
    } catch {
      res.status(400).json({ error: "Invalid JSON." });
      return;
    }

    const parsed = resendInboundEventSchema.safeParse(json);
    if (!parsed.success) {
      console.error(
        "[tickets] inbound payload inválido:",
        parsed.error.message,
      );
      res.status(400).json({ error: "Invalid payload." });
      return;
    }

    // Idempotência: usa svix-id se presente; fallback pro id do data
    // (alguns payloads têm). Combina com prefixo "resend" no
    // markEventProcessed pra namespacing.
    const svixId =
      pickHeader(req.headers, "svix-id") ?? parsed.data.data.id ?? null;
    if (svixId) {
      const { isNew } = await markEventProcessed({
        provider: "resend",
        eventKey: svixId,
        eventType: parsed.data.type ?? "email.received",
      });
      if (!isNew) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }
    }

    const messageId = extractMessageId(parsed.data);
    const inReplyTo = extractInReplyTo(parsed.data);

    const input: HandleInboundEmailInput = {
      from: parsed.data.data.from,
      toAddresses: parsed.data.data.to,
      subject: parsed.data.data.subject ?? "",
      bodyText: parsed.data.data.text ?? stripHtml(parsed.data.data.html ?? ""),
      bodyHtml: parsed.data.data.html ?? null,
      messageId,
      inReplyTo,
      attachments: (parsed.data.data.attachments ?? []).map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        providerUrl: a.providerUrl ?? "",
      })),
    };

    try {
      await this.deps.handleInboundEmail.execute(input);
    } catch (err) {
      console.error("[tickets] handler de inbound erro:", err);
      // 200 mesmo assim pra não fazer Resend reentregar em loop.
    }
    res.status(200).json({ received: true });
  };

  // ─── Endpoints staff (Kintal) ───────────────────────────────────────

  list: RequestHandler = async (req, res, next) => {
    try {
      const query = listTicketsQuery.parse(req.query);
      const userId = req.auth!.userId;
      let items = await this.deps.list.execute({
        kind: query.kind,
        status: query.status,
        limit: query.limit,
        before: query.before,
      });
      // Filtro client-side de unread: feito após list pra reaproveitar
      // o mesmo path. Volume baixo (até 200 itens), aceitável.
      if (query.unreadOnly) {
        items = items.filter(
          (t) => t.kind === "general" && !t.isReadBy(userId),
        );
      }
      const counts = await this.deps.list.counts({
        kind: query.kind,
        userId,
      });
      res.json({
        data: {
          items: items.map((t) => toListDTO(t, userId)),
          counts,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  get: RequestHandler = async (req, res, next) => {
    try {
      const { id } = ticketIdParam.parse(req.params);
      const userId = req.auth!.userId;
      const ticket = await this.deps.get.execute({ ticketId: id });
      res.json({ data: toDetailDTO(ticket, userId) });
    } catch (err) {
      next(err);
    }
  };

  reply: RequestHandler = async (req, res, next) => {
    try {
      if (!this.deps.reply) {
        res.status(503).json({
          code: "TICKETS_NOT_CONFIGURED",
          message: "Tickets não está habilitado neste ambiente.",
        });
        return;
      }
      const { id } = ticketIdParam.parse(req.params);
      const { bodyText } = replyBody.parse(req.body);
      const ctx = req.auth!;
      const result = await this.deps.reply.execute({
        ticketId: id,
        bodyText,
        staffEmail: ctx.realEmail ?? "",
        staffName: null,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  close: RequestHandler = async (req, res, next) => {
    try {
      const { id } = ticketIdParam.parse(req.params);
      await this.deps.close.execute({ ticketId: id });
      res.json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  };

  reopen: RequestHandler = async (req, res, next) => {
    try {
      const { id } = ticketIdParam.parse(req.params);
      await this.deps.reopen.execute({ ticketId: id });
      res.json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  };

  markRead: RequestHandler = async (req, res, next) => {
    try {
      const { id } = ticketIdParam.parse(req.params);
      await this.deps.markRead.execute({
        ticketId: id,
        userId: req.auth!.userId,
      });
      res.json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  };

  markUnread: RequestHandler = async (req, res, next) => {
    try {
      const { id } = ticketIdParam.parse(req.params);
      await this.deps.markUnread.execute({
        ticketId: id,
        userId: req.auth!.userId,
      });
      res.json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  };
}

// ─── DTO mappers ────────────────────────────────────────────────────

function toListDTO(t: Ticket, viewerUserId: string) {
  const last = t.lastMessage();
  return {
    id: t.id.toString(),
    kind: t.kind,
    subject: t.subject,
    status: t.status,
    customerEmail: t.customerEmail,
    customerName: t.customerName,
    origin: t.origin,
    awaitingStaff: t.awaitingStaff(),
    /** Lido por mim — relevante em kind=general (caixa de entrada). */
    readByMe: t.isReadBy(viewerUserId),
    lastMessagePreview: last
      ? {
          direction: last.direction,
          kind: last.kind,
          textSnippet: last.bodyText.slice(0, 200),
          createdAt: last.createdAt.toISOString(),
        }
      : null,
    messagesCount: t.messages.length,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
  };
}

function toDetailDTO(t: Ticket, viewerUserId: string) {
  return {
    ...toListDTO(t, viewerUserId),
    userId: t.userId,
    messages: t.messages.map(toMessageDTO),
  };
}

function toMessageDTO(m: TicketMessage) {
  return {
    id: m.id,
    direction: m.direction,
    kind: m.kind,
    fromEmail: m.fromEmail,
    fromName: m.fromName,
    bodyText: m.bodyText,
    bodyHtml: m.bodyHtml,
    attachments: m.attachments,
    createdAt: m.createdAt.toISOString(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const v = headers[name] ?? headers[name.toLowerCase()];
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim();
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
