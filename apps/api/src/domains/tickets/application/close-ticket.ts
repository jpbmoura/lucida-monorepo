import { TicketId } from "../domain/ticket-id.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import { TicketNotFoundError } from "../domain/tickets-errors.js";

export interface CloseTicketInput {
  ticketId: string;
}

/**
 * Marca ticket como `done`. Idempotente — concluir um já concluído é
 * no-op. Cliente que responder depois reabre automático (lógica em
 * `Ticket.addInboundMessage`).
 */
export class CloseTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: CloseTicketInput): Promise<void> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    ticket.markDone();
    await this.tickets.save(ticket);
  }
}

/**
 * Marca ticket como `read` — terminal igual a `done`, mas pra emails
 * que não viraram thread (notificações automáticas, marketing). Cliente
 * respondendo reabre automático (mesma lógica de done).
 */
export class MarkReadTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: CloseTicketInput): Promise<void> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    ticket.markRead();
    await this.tickets.save(ticket);
  }
}

/** Reabertura manual via UI (auto-reabrir acontece em addInboundMessage). */
export class ReopenTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: CloseTicketInput): Promise<void> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    ticket.reopen();
    await this.tickets.save(ticket);
  }
}
