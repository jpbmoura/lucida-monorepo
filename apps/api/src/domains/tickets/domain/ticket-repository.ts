import type { Ticket } from "./ticket.js";
import { TicketId } from "./ticket-id.js";
import type { TicketStatus } from "./ticket-status.js";

export interface ListTicketsOptions {
  /** Filtrar por status. Sem filtro = todos. */
  status?: TicketStatus;
  /** Default 50, máx 200. */
  limit?: number;
  /** Cursor: tickets com `updatedAt` anterior a essa data. */
  before?: Date;
}

export interface TicketRepository {
  nextId(): TicketId;
  /** Cria um message id local (UUID) — usado pra build do Message-ID outbound. */
  nextMessageId(): string;

  save(ticket: Ticket): Promise<void>;
  findById(id: TicketId): Promise<Ticket | null>;

  /**
   * Lookup pelo `providerMessageId` de uma mensagem outbound — usado pra
   * threading: quando cliente responde, vem In-Reply-To apontando pro ID
   * que enviamos. Match nesse campo dá o ticket original.
   */
  findByOutboundMessageId(messageId: string): Promise<Ticket | null>;

  list(opts?: ListTicketsOptions): Promise<Ticket[]>;

  /** Conta de tickets por status — usado pros badges das tabs do Kintal. */
  countByStatus(status: TicketStatus): Promise<number>;
}
