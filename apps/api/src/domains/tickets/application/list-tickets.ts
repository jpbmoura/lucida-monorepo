import type { Ticket } from "../domain/ticket.js";
import type {
  ListTicketsOptions,
  TicketRepository,
} from "../domain/ticket-repository.js";
import type { TicketKind } from "../domain/ticket-kind.js";
import type { TicketStatus } from "../domain/ticket-status.js";

export interface ListTicketsInput extends ListTicketsOptions {}

export interface TicketsCounts {
  open: number;
  closed: number;
  /** Conta de tickets `kind=general` que ESSE user ainda não leu. */
  unreadInbox?: number;
}

/** Lista tickets pra UI staff (Kintal). */
export class ListTicketsUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  execute(input: ListTicketsInput = {}): Promise<Ticket[]> {
    return this.tickets.list(input);
  }

  /**
   * Counts pra badges/headers do Kintal.
   *  - support open/closed: counts globais
   *  - unreadInbox: per-user (precisa do userId)
   *
   * Se não passar userId, omite unreadInbox.
   */
  async counts(opts?: {
    kind?: TicketKind;
    userId?: string;
  }): Promise<TicketsCounts> {
    const [openCount, closedCount, unreadInbox] = await Promise.all([
      this.tickets.countByStatus(
        "open" satisfies TicketStatus,
        opts?.kind,
      ),
      this.tickets.countByStatus(
        "closed" satisfies TicketStatus,
        opts?.kind,
      ),
      opts?.userId
        ? this.tickets.countUnreadByUser(opts.userId)
        : Promise.resolve(undefined),
    ]);
    return {
      open: openCount,
      closed: closedCount,
      unreadInbox,
    };
  }
}
