import type { TicketAttachment } from "../domain/ticket-message.js";
import { Ticket } from "../domain/ticket.js";
import { TicketId } from "../domain/ticket-id.js";
import { TicketMessage } from "../domain/ticket-message.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import { parseEmailAddress, parsePlusAddressing } from "../infrastructure/threading.js";
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

/**
 * Roteia email recebido pra ticket existente ou cria um novo. Estratégia
 * de match em ordem:
 *
 *  1. Plus addressing — `to: contato+t_<id>@...` → ticketId direto.
 *  2. In-Reply-To — header bate com `providerMessageId` de uma mensagem
 *     outbound nossa. Caminho RFC 5322 standard.
 *
 * Threading é só por sinal explícito (plus-address ou In-Reply-To). Email
 * novo do mesmo cliente, mesmo dentro de minutos, vira ticket novo —
 * cada compose nova é uma conversa separada.
 *
 * Se nenhuma estratégia bater, cria ticket novo. UserId opcional (lookup
 * pelo email do cliente; null quando não tem cadastro Lucida).
 */
export class HandleInboundEmailUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly userLookup: UserLookup,
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

    // 3. Sem match explícito → cria ticket novo.
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
      subject: input.subject?.trim() || "(sem assunto)",
      customerEmail: fromEmail,
      customerName: fromName,
      userId,
      origin: "email",
      initialMessage,
    });
    await this.tickets.save(ticket);

    // Notifica staff (Kintal). Best-effort.
    if (this.notifier) {
      await this.notifier.notifyNewTicket(ticket);
    }

    return { ticketId: ticket.id.toString(), created: true };
  }
}
