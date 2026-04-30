import { TicketId } from "../domain/ticket-id.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import { TicketNotFoundError } from "../domain/tickets-errors.js";

export interface CloseTicketInput {
  ticketId: string;
}

/**
 * Marca ticket como `closed`. Idempotente — fechar um já fechado é
 * no-op. Cliente que responder depois reabre automático (lógica em
 * HandleInboundEmail).
 */
export class CloseTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: CloseTicketInput): Promise<void> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    ticket.close();
    await this.tickets.save(ticket);
  }
}

/** Reabertura manual via UI (o auto-reabrir acontece em HandleInboundEmail). */
export class ReopenTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: CloseTicketInput): Promise<void> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    ticket.reopen();
    await this.tickets.save(ticket);
  }
}
