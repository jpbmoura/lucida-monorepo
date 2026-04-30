import { TicketId } from "../domain/ticket-id.js";
import type { Ticket } from "../domain/ticket.js";
import type { TicketRepository } from "../domain/ticket-repository.js";
import { TicketNotFoundError } from "../domain/tickets-errors.js";

export class GetTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: { ticketId: string }): Promise<Ticket> {
    const ticket = await this.tickets.findById(TicketId.of(input.ticketId));
    if (!ticket) throw new TicketNotFoundError();
    return ticket;
  }
}
