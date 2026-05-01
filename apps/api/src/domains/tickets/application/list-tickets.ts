import type { Ticket } from "../domain/ticket.js";
import type {
  ListTicketsOptions,
  TicketRepository,
} from "../domain/ticket-repository.js";
import type { TicketStatus } from "../domain/ticket-status.js";

export interface ListTicketsInput extends ListTicketsOptions {}

export interface TicketsCounts {
  new: number;
  in_progress: number;
  done: number;
}

/** Lista tickets pra UI staff (Kintal). */
export class ListTicketsUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  execute(input: ListTicketsInput = {}): Promise<Ticket[]> {
    return this.tickets.list(input);
  }

  /** Counts pros badges das tabs (Novos / Em andamento / Concluídos). */
  async counts(): Promise<TicketsCounts> {
    const statuses: TicketStatus[] = ["new", "in_progress", "done"];
    const [n, inProgress, done] = await Promise.all(
      statuses.map((s) => this.tickets.countByStatus(s)),
    );
    return {
      new: n ?? 0,
      in_progress: inProgress ?? 0,
      done: done ?? 0,
    };
  }
}
