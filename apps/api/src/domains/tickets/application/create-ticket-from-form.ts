import { Ticket } from "../domain/ticket.js";
import { TicketMessage } from "../domain/ticket-message.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import type { TicketNotifier } from "./ticket-notifier.js";

export interface CreateTicketFromFormInput {
  /** Email do user que submeteu o form (pego da session). */
  customerEmail: string;
  /** Nome do user da session (pode ser null). */
  customerName: string | null;
  /** ID do user logado — sempre presente porque o form exige auth. */
  userId: string;
  /** Subject ou tópico do form (se houver) — fallback "Suporte via formulário". */
  subject: string;
  /** Mensagem digitada no formulário. */
  bodyText: string;
}

/**
 * Cria ticket a partir do formulário em /app/ajuda. Diferente do email:
 * `origin: "form"`, sem `providerMessageId` (não veio de webhook), e
 * o user já é conhecido (vem da session do BetterAuth).
 *
 * Não dispara auto-resposta — o user já vê confirmação na própria UI
 * do form ("recebemos sua mensagem"). Mandar email seria redundante.
 */
export class CreateTicketFromFormUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    /** Opcional. Notifica staff via Kintal quando ticket criado. */
    private readonly notifier: TicketNotifier | null = null,
  ) {}

  async execute(input: CreateTicketFromFormInput): Promise<{ ticketId: string }> {
    const message = TicketMessage.create({
      id: this.tickets.nextMessageId(),
      direction: "inbound",
      kind: "manual",
      fromEmail: input.customerEmail,
      fromName: input.customerName,
      bodyText: input.bodyText,
      bodyHtml: null,
    });
    const ticket = Ticket.create({
      id: this.tickets.nextId(),
      subject: input.subject?.trim() || "Suporte via formulário",
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      userId: input.userId,
      origin: "form",
      initialMessage: message,
    });
    await this.tickets.save(ticket);

    if (this.notifier) {
      await this.notifier.notifyNewTicket(ticket);
    }

    return { ticketId: ticket.id.toString() };
  }
}
