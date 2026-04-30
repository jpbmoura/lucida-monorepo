import type { TicketAttachment } from "../domain/ticket-message.js";
import { Ticket } from "../domain/ticket.js";
import { TicketId } from "../domain/ticket-id.js";
import type { TicketKind } from "../domain/ticket-kind.js";
import { TicketMessage } from "../domain/ticket-message.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import { parseEmailAddress, parsePlusAddressing } from "../infrastructure/threading.js";
import { ticketAutoResponderTemplate } from "../infrastructure/ticket-email-templates.js";
import type { TicketMailer } from "./ticket-mailer.js";
import type { TicketNotifier } from "./ticket-notifier.js";
import type { UserLookup } from "./user-lookup.js";

/**
 * Input já normalizado a partir do payload do provider Resend Inbound.
 * Mantemos shape neutro (sem termos `data.headers.Message-ID` etc) pra
 * permitir trocar de provider sem mexer no use case.
 */
export interface HandleInboundEmailInput {
  /** "Nome <email@dominio>" ou só "email@dominio". Vamos parsear. */
  from: string;
  /** Lista de destinatários (`To`) — checamos plus addressing aqui. */
  toAddresses: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  /** Header Message-ID do email recebido — guardamos pra debug. */
  messageId: string | null;
  /** Header In-Reply-To — usado pra threading. */
  inReplyTo: string | null;
  attachments: TicketAttachment[];
}

export interface HandleInboundEmailOutput {
  ticketId: string;
  /** True quando criou ticket novo; false quando adicionou a existente. */
  created: boolean;
}

const FALLBACK_LOOKUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Roteia email recebido pra ticket existente ou cria um novo. Estratégia
 * de match em ordem:
 *
 *  1. Plus addressing — `to: suporte+t_<id>@...` → ticketId direto.
 *  2. In-Reply-To — header bate com `providerMessageId` de uma mensagem
 *     outbound nossa. Caminho RFC 5322 standard.
 *  3. Fallback de 24h — tickets recentes do mesmo email do cliente.
 *
 * Se nenhum bater, cria ticket novo. UserId opcional (lookup pelo email
 * do cliente; null quando não tem cadastro Lucida).
 */
export class HandleInboundEmailUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly userLookup: UserLookup,
    /**
     * Mailer pra disparar auto-resposta quando ticket é criado novo.
     * Opcional — se não configurado, ticket é criado mas auto-resposta
     * não é enviada (best-effort). Mesmo padrão de outros mailers.
     */
    private readonly mailer: TicketMailer | null = null,
    /** Sender pra registrar em `fromEmail` da mensagem auto. */
    private readonly autoResponderFromEmail: string | null = null,
    /**
     * Notifica staff via Kintal quando ticket é criado novo. Best-effort,
     * opcional. Quando null, ticket cria silencioso (staff descobre via
     * lista do Kintal manualmente).
     */
    private readonly notifier: TicketNotifier | null = null,
  ) {}

  async execute(
    input: HandleInboundEmailInput,
  ): Promise<HandleInboundEmailOutput> {
    const fromParts = parseEmailAddress(input.from);
    const fromEmail = fromParts ? `${fromParts.local}@${fromParts.domain}` : input.from;
    const fromName = fromParts?.name ?? null;

    // 1. Plus addressing — checa cada `to`.
    const plusTicketId = parsePlusAddressing(input.toAddresses);
    if (plusTicketId) {
      const ticket = await this.tickets.findById(TicketId.of(plusTicketId));
      if (ticket) {
        return this.appendToExisting(ticket, input, fromEmail, fromName);
      }
    }

    // 2. In-Reply-To.
    if (input.inReplyTo) {
      const ticket = await this.tickets.findByOutboundMessageId(input.inReplyTo);
      if (ticket) {
        return this.appendToExisting(ticket, input, fromEmail, fromName);
      }
    }

    // 3. Fallback 24h pelo email do cliente.
    const recents = await this.tickets.findRecentByCustomerEmail(
      fromEmail,
      FALLBACK_LOOKUP_WINDOW_MS,
    );
    if (recents.length > 0 && recents[0]) {
      return this.appendToExisting(recents[0], input, fromEmail, fromName);
    }

    // 4. Sem match → cria novo.
    return this.createNew(input, fromEmail, fromName);
  }

  private async appendToExisting(
    ticket: Ticket,
    input: HandleInboundEmailInput,
    fromEmail: string,
    fromName: string | null,
  ): Promise<HandleInboundEmailOutput> {
    const msg = TicketMessage.create({
      id: this.tickets.nextMessageId(),
      direction: "inbound",
      kind: "manual",
      fromEmail,
      fromName,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      providerMessageId: input.messageId,
      inReplyTo: input.inReplyTo,
      attachments: input.attachments,
    });
    ticket.addInboundMessage(msg);
    await this.tickets.save(ticket);
    return { ticketId: ticket.id.toString(), created: false };
  }

  private async createNew(
    input: HandleInboundEmailInput,
    fromEmail: string,
    fromName: string | null,
  ): Promise<HandleInboundEmailOutput> {
    const kind = inferKindFromTo(input.toAddresses);
    const userId = await this.userLookup.findIdByEmail(fromEmail);
    const initialMessage = TicketMessage.create({
      id: this.tickets.nextMessageId(),
      direction: "inbound",
      kind: "manual",
      fromEmail,
      fromName,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      providerMessageId: input.messageId,
      inReplyTo: input.inReplyTo,
      attachments: input.attachments,
    });
    const ticket = Ticket.create({
      id: this.tickets.nextId(),
      kind,
      subject: input.subject?.trim() || "(sem assunto)",
      customerEmail: fromEmail,
      customerName: fromName,
      userId,
      origin: "email",
      initialMessage,
    });
    await this.tickets.save(ticket);

    // Auto-resposta só pra `support` — `general` é caixa de entrada genérica
    // (contato@), e auto-reply soaria robótico em conversa institucional.
    if (kind === "support") {
      await this.tryAutoRespond(ticket, input);
    }

    // Notifica staff (Kintal). Best-effort.
    if (this.notifier) {
      await this.notifier.notifyNewTicket(ticket);
    }

    return { ticketId: ticket.id.toString(), created: true };
  }

  /**
   * Envia auto-resposta de "recebemos seu email" e persiste a mensagem
   * outbound (kind=auto) no ticket. Best-effort: log + segue se falhar.
   */
  private async tryAutoRespond(
    ticket: Ticket,
    input: HandleInboundEmailInput,
  ): Promise<void> {
    if (!this.mailer || !this.autoResponderFromEmail) return;

    const template = ticketAutoResponderTemplate({
      customerName: ticket.customerName,
    });
    const messageId = this.tickets.nextMessageId();

    try {
      const { providerMessageId } = await this.mailer.sendAutoResponder({
        ticketId: ticket.id.toString(),
        messageId,
        toEmail: ticket.customerEmail,
        customerName: ticket.customerName,
        subject: template.subject,
        inReplyTo: input.messageId ?? null,
      });

      const autoMsg = TicketMessage.create({
        id: messageId,
        direction: "outbound",
        kind: "auto",
        fromEmail: this.autoResponderFromEmail,
        fromName: "Lucida Suporte",
        bodyText: template.text,
        bodyHtml: template.html,
        providerMessageId,
        inReplyTo: input.messageId ?? null,
      });
      ticket.addOutboundMessage(autoMsg);
      await this.tickets.save(ticket);
    } catch (err) {
      console.error(
        "[tickets] auto-responder falhou (skip):",
        ticket.id.toString(),
        err,
      );
    }
  }
}

/**
 * Decide o `kind` do ticket a partir do endereço destinatário do email.
 *  - `suporte@*` → support (helpdesk completo, auto-resposta, status)
 *  - qualquer outro → general (caixa de entrada estilo Gmail)
 *
 * Catch-all em general é proposital — se um cliente errar e mandar
 * pra `oi@`, `ola@`, etc., a gente ainda vê a mensagem.
 */
function inferKindFromTo(toAddresses: string[]): TicketKind {
  const localParts = toAddresses
    .map((addr) => parseEmailAddress(addr)?.local.toLowerCase())
    .filter((v): v is string => Boolean(v));

  // Plus-addressing: `suporte+t_xyz@` → ainda é suporte. Splitamos no `+`.
  const baseLocals = localParts.map((l) => l.split("+")[0] ?? l);
  if (baseLocals.includes("suporte")) return "support";
  return "general";
}
