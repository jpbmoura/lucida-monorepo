import { TicketId } from "../domain/ticket-id.js";
import { TicketMessage } from "../domain/ticket-message.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import {
  TicketNotFoundError,
  TicketReplyEmptyError,
} from "../domain/tickets-errors.js";
import type { TicketMailer } from "./ticket-mailer.js";

export interface ReplyToTicketInput {
  ticketId: string;
  /** Texto da resposta — staff escreve no Kintal. */
  bodyText: string;
  /** Email do staff que está respondendo (pra `fromEmail` na mensagem). */
  staffEmail: string;
  /** Nome do staff (display). */
  staffName: string | null;
}

export interface ReplyToTicketOutput {
  ticketId: string;
  messageId: string;
}

/**
 * Staff responde um ticket. Fluxo:
 *
 *  1. Acha o ticket
 *  2. Cria a mensagem outbound localmente (com UUID gerado)
 *  3. Envia o email via TicketMailer (que monta Message-ID, Reply-To,
 *     In-Reply-To baseado na última mensagem inbound)
 *  4. Atualiza a mensagem com `providerMessageId` retornado pelo Resend
 *  5. Persiste o ticket
 *
 * Idempotência: caller é o controller (HTTP) — staff só clica "Enviar"
 * uma vez. Não há reprocessamento automático. Se o send falhar, a
 * mensagem **não** fica salva (rollback simples: erro propaga, save
 * não acontece).
 */
export class ReplyToTicketUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly mailer: TicketMailer,
  ) {}

  async execute(input: ReplyToTicketInput): Promise<ReplyToTicketOutput> {
    const body = input.bodyText.trim();
    if (!body) {
      throw new TicketReplyEmptyError();
    }

    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) {
      throw new TicketNotFoundError();
    }

    // Última mensagem do cliente: usamos o providerMessageId dela como
    // In-Reply-To. Pode não ter (ticket criado via form não tem
    // providerMessageId). Mailer aceita undefined.
    const lastInbound = [...ticket.messages]
      .reverse()
      .find((m) => m.direction === "inbound");
    const inReplyTo = lastInbound?.providerMessageId ?? undefined;

    const messageId = this.tickets.nextMessageId();
    const subject = formatReplySubject(ticket.subject);

    const { providerMessageId } = await this.mailer.sendReply({
      ticketId: ticket.id.toString(),
      messageId,
      toEmail: ticket.customerEmail,
      subject,
      bodyText: body,
      inReplyTo,
    });

    const message = TicketMessage.create({
      id: messageId,
      direction: "outbound",
      kind: "manual",
      fromEmail: input.staffEmail,
      fromName: input.staffName,
      bodyText: body,
      bodyHtml: null,
      providerMessageId,
      inReplyTo: inReplyTo ?? null,
    });
    ticket.addOutboundMessage(message);
    await this.tickets.save(ticket);

    return {
      ticketId: ticket.id.toString(),
      messageId,
    };
  }
}

/** Adiciona "Re:" no subject se ainda não tiver. */
function formatReplySubject(original: string): string {
  if (/^re:\s*/i.test(original)) return original;
  return `Re: ${original}`;
}
