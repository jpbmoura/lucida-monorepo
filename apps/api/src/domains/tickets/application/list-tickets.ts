import type { Ticket } from "../domain/ticket.js";
import type {
  CountsByBox,
  ListTicketsOptions,
  TicketRepository,
} from "../domain/ticket-repository.js";

export interface ListTicketsInput extends ListTicketsOptions {}

/** Lista tickets pra UI staff (Kintal). */
export class ListTicketsUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  execute(input: ListTicketsInput = {}): Promise<Ticket[]> {
    return this.tickets.list(input);
  }

  /** Counts pros badges das tabs (inbox por status + outbox por status). */
  counts(): Promise<CountsByBox> {
    return this.tickets.countByBoxAndStatus();
  }
}
