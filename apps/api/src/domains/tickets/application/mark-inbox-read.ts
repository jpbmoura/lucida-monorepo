import { TicketId } from "../domain/ticket-id.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import { TicketNotFoundError } from "../domain/tickets-errors.js";

export interface MarkInboxReadInput {
  ticketId: string;
  userId: string;
}

/**
 * Marca um ticket como lido por um staff. Usado principalmente em
 * `kind=general` (caixa de entrada). Em `kind=support` é no-op
 * funcional (campo existe mas UI não usa).
 *
 * Idempotente — chamar duas vezes pra mesma combinação não muda nada.
 */
export class MarkInboxReadUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: MarkInboxReadInput): Promise<void> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    ticket.markReadBy(input.userId);
    await this.tickets.save(ticket);
  }
}

export class MarkInboxUnreadUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: MarkInboxReadInput): Promise<void> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    ticket.markUnreadBy(input.userId);
    await this.tickets.save(ticket);
  }
}
