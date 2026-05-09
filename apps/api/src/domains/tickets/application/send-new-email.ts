import { Ticket } from "../domain/ticket.js";
import { TicketMessage } from "../domain/ticket-message.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import {
  TicketComposeBodyEmptyError,
  TicketComposeInvalidEmailError,
  TicketComposeSubjectEmptyError,
} from "../domain/tickets-errors.js";
import type { TicketMailer } from "./ticket-mailer.js";
import type { UserLookup } from "./user-lookup.js";

export interface SendNewEmailInput {
  /** Email do destinatário (cliente). */
  customerEmail: string;
  /** Nome opcional. Quando vazio, ticket nasce sem `customerName`. */
  customerName?: string | null;
  /** Assunto digitado pelo staff — sem prefix "Re:". */
  subject: string;
  /** Corpo da mensagem em texto puro. */
  bodyText: string;
  /** Email do staff (pra `fromEmail` na mensagem persistida). */
  staffEmail: string;
  /** Nome de exibição do staff. */
  staffName: string | null;
}

export interface SendNewEmailOutput {
  ticketId: string;
  messageId: string;
}

/**
 * Staff inicia uma nova conversa via Kintal (compose new). Fluxo:
 *
 *  1. Valida campos (email/subject/body).
 *  2. Resolve userId via `UserLookup` (best-effort) — útil pra deeplink.
 *  3. Monta `Ticket` com origem `staff` e status inicial `in_progress`
 *     (já há ação do staff, aguardando cliente responder).
 *  4. Envia o email via `TicketMailer.sendNew`.
 *  5. Atualiza `providerMessageId` retornado pelo Resend e persiste.
 *
 * Threading futuro: o Reply-To carrega plus-addressing (`+t_<id>`); se
 * o cliente responder mantendo o `to`, cai via `parsePlusAddressing`.
 * Se responder pelo header (`In-Reply-To`), cai via
 * `findByOutboundMessageId` matchando o `providerMessageId` salvo aqui.
 */
export class SendNewEmailUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly mailer: TicketMailer,
    private readonly userLookup: UserLookup,
  ) {}

  async execute(input: SendNewEmailInput): Promise<SendNewEmailOutput> {
    const customerEmail = input.customerEmail.trim().toLowerCase();
    const subject = input.subject.trim();
    const bodyText = input.bodyText.trim();
    const customerName = input.customerName?.trim() || null;

    if (!isLikelyEmail(customerEmail)) {
      throw new TicketComposeInvalidEmailError();
    }
    if (!subject) {
      throw new TicketComposeSubjectEmptyError();
    }
    if (!bodyText) {
      throw new TicketComposeBodyEmptyError();
    }

    const userId = await this.userLookup.findIdByEmail(customerEmail);
    const ticketId = this.tickets.nextId();
    const messageId = this.tickets.nextMessageId();

    const message = TicketMessage.create({
      id: messageId,
      direction: "outbound",
      kind: "manual",
      fromEmail: input.staffEmail,
      fromName: input.staffName,
      bodyText,
      bodyHtml: null,
      providerMessageId: null,
      inReplyTo: null,
    });

    const ticket = Ticket.create({
      id: ticketId,
      subject,
      customerEmail,
      customerName,
      userId,
      origin: "staff",
      initialMessage: message,
      // Staff já agiu — nasce em "em andamento", aguardando cliente.
      initialStatus: "in_progress",
    });

    const { providerMessageId } = await this.mailer.sendNew({
      ticketId: ticketId.toString(),
      messageId,
      toEmail: customerEmail,
      subject,
      bodyText,
    });

    message.setProviderMessageId(providerMessageId);
    await this.tickets.save(ticket);

    return {
      ticketId: ticketId.toString(),
      messageId,
    };
  }
}

/** Validação leve — bate o regex final no use case + Zod no schema HTTP. */
function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
