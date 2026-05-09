import type { RequestHandler } from "express";
import { env } from "@/env.js";
import { markEventProcessed } from "@/domains/billing/infrastructure/webhook-idempotency.js";
import type {
  CloseTicketUseCase,
  MarkReadTicketUseCase,
  ReopenTicketUseCase,
} from "../application/close-ticket.js";
import type { BulkUpdateStatusUseCase } from "../application/bulk-update-status.js";
import type { GetTicketUseCase } from "../application/get-ticket.js";
import type {
  HandleInboundEmailInput,
  HandleInboundEmailUseCase,
} from "../application/handle-inbound-email.js";
import type { ListTicketsUseCase } from "../application/list-tickets.js";
import type { ReplyToTicketUseCase } from "../application/reply-to-ticket.js";
import type { SendNewEmailUseCase } from "../application/send-new-email.js";
import type { Ticket } from "../domain/ticket.js";
import { TicketId } from "../domain/ticket-id.js";
import type { TicketMessage } from "../domain/ticket-message.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import { fetchInboundEmailBody } from "../infrastructure/resend/fetch-inbound-body.js";
import {
  extractInReplyTo,
  extractMessageId,
  resendInboundEventSchema,
} from "../infrastructure/resend/resend-inbound-event-schema.js";
import { verifyResendInboundWebhook } from "../infrastructure/resend/resend-inbound-verify.js";
import {
  bulkUpdateStatusBody,
  composeBody,
  listTicketsQuery,
  replyBody,
  ticketIdParam,
} from "./tickets-schemas.js";

interface Deps {
  /** Opcional — null quando Resend Inbound (TICKETS_INBOUND_SECRET) não configurado. */
  handleInboundEmail: HandleInboundEmailUseCase | null;
  list: ListTicketsUseCase;
  get: GetTicketUseCase;
  reply: ReplyToTicketUseCase | null;
  /** Opcional — null quando TICKETS_FROM_EMAIL não configurado. */
  sendNew: SendNewEmailUseCase | null;
  markDone: CloseTicketUseCase;
  markRead: MarkReadTicketUseCase;
  reopen: ReopenTicketUseCase;
  bulkUpdateStatus: BulkUpdateStatusUseCase;
  /**
   * Repositório usado pra hidratar o detalhe com `relatedTickets` (outras
   * threads do mesmo customerEmail). Inicial pequeno, fica inline aqui em
   * vez de criar um use case dedicado.
   */
  repository: TicketRepository;
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

    // Filtra eventos que não interessam (e que podem ter shape diferente —
    // Resend manda eventos batch com `data: array` que quebrariam nossa
    // validação). Só processamos `email.received` (inbound de email único).
    // Devolvemos 200 ack pra qualquer outro evento — não é erro do remetente.
    const eventType =
      typeof json === "object" && json !== null
        ? (json as { type?: unknown }).type
        : undefined;
    if (eventType !== "email.received") {
      res.status(200).json({ received: true, ignored: true });
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

    // Body vem no webhook payload (campos `text`/`html` do data).
    // Se não vier, tentamos fetch via API como fallback.
    let bodyText = parsed.data.data.text ?? "";
    let bodyHtml = parsed.data.data.html ?? null;
    if (!bodyText && !bodyHtml && parsed.data.data.email_id) {
      const fetched = await fetchInboundEmailBody(parsed.data.data.email_id);
      bodyText = fetched.text || stripHtml(fetched.html ?? "");
      bodyHtml = fetched.html;
    } else if (!bodyText && bodyHtml) {
      bodyText = stripHtml(bodyHtml);
    }
    if (!bodyText && !bodyHtml) {
      console.warn("[tickets] webhook sem body — config do Resend Inbound:", {
        emailId: parsed.data.data.email_id,
        type: parsed.data.type,
        from: parsed.data.data.from,
      });
    }

    const input: HandleInboundEmailInput = {
      from: parsed.data.data.from,
      toAddresses: parsed.data.data.to,
      subject: parsed.data.data.subject ?? "",
      bodyText,
      bodyHtml,
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
      const box = query.box ?? "inbox";
      const items = await this.deps.list.execute({
        status: query.status,
        box,
        limit: query.limit,
        before: query.before,
      });
      const counts = await this.deps.list.counts();
      res.json({
        data: {
          items: items.map(toListDTO),
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
      const ticket = await this.deps.get.execute({ ticketId: id });
      // Hidratamos o painel lateral com até 5 threads anteriores do
      // mesmo cliente. Útil principalmente pra não-cliente (sem userId)
      // mas fica disponível pra todos.
      const related = await this.deps.repository.findRecentByCustomerEmail({
        email: ticket.customerEmail,
        excludeId: TicketId.of(ticket.id.toString()),
        limit: 5,
      });
      res.json({ data: toDetailDTO(ticket, related) });
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

  compose: RequestHandler = async (req, res, next) => {
    try {
      if (!this.deps.sendNew) {
        res.status(503).json({
          code: "TICKETS_NOT_CONFIGURED",
          message: "Tickets não está habilitado neste ambiente.",
        });
        return;
      }
      const body = composeBody.parse(req.body);
      const ctx = req.auth!;
      const result = await this.deps.sendNew.execute({
        customerEmail: body.customerEmail,
        customerName: body.customerName ?? null,
        subject: body.subject,
        bodyText: body.bodyText,
        staffEmail: ctx.realEmail ?? "",
        staffName: null,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  markDone: RequestHandler = async (req, res, next) => {
    try {
      const { id } = ticketIdParam.parse(req.params);
      await this.deps.markDone.execute({ ticketId: id });
      res.json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  };

  markRead: RequestHandler = async (req, res, next) => {
    try {
      const { id } = ticketIdParam.parse(req.params);
      await this.deps.markRead.execute({ ticketId: id });
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

  bulkStatus: RequestHandler = async (req, res, next) => {
    try {
      const body = bulkUpdateStatusBody.parse(req.body);
      const result = await this.deps.bulkUpdateStatus.execute({
        ids: body.ids,
        status: body.status,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

// ─── DTO mappers ────────────────────────────────────────────────────

function toListDTO(t: Ticket) {
  const last = t.lastMessage();
  return {
    id: t.id.toString(),
    subject: t.subject,
    status: t.status,
    customerEmail: t.customerEmail,
    customerName: t.customerName,
    origin: t.origin,
    awaitingStaff: t.awaitingStaff(),
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
    doneAt: t.doneAt?.toISOString() ?? null,
  };
}

function toDetailDTO(t: Ticket, related: Ticket[]) {
  return {
    ...toListDTO(t),
    userId: t.userId,
    messages: t.messages.map(toMessageDTO),
    relatedTickets: related.map(toRelatedDTO),
  };
}

function toRelatedDTO(t: Ticket) {
  return {
    id: t.id.toString(),
    subject: t.subject,
    status: t.status,
    awaitingStaff: t.awaitingStaff(),
    updatedAt: t.updatedAt.toISOString(),
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
