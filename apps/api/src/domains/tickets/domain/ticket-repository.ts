import type { Ticket } from "./ticket.js";
import { TicketId } from "./ticket-id.js";
import type { TicketStatus } from "./ticket-status.js";

/**
 * Escopo da listagem usado pelo Kintal:
 *  - `inbox`  → tickets iniciados pelo cliente (origin `email` ou `form`)
 *  - `outbox` → tickets iniciados pela equipe via Kintal (origin `staff`)
 */
export type TicketBox = "inbox" | "outbox";

export interface ListTicketsOptions {
  /** Filtrar por status. Sem filtro = todos. */
  status?: TicketStatus;
  /** Caixa (entrada/saída). Sem filtro = todos os escopos. */
  box?: TicketBox;
  /** Default 50, máx 200. */
  limit?: number;
  /** Cursor: tickets com `updatedAt` anterior a essa data. */
  before?: Date;
}

export interface CountsByStatus {
  new: number;
  in_progress: number;
  done: number;
  read: number;
}

export interface CountsByBox {
  inbox: CountsByStatus;
  outbox: CountsByStatus;
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

  /**
   * Outros tickets com o mesmo email de cliente, excluindo o `excludeId`.
   * Usado no painel lateral do detalhe pra dar contexto ("já recebi 3
   * emails dessa pessoa antes"). Ordenado por `updatedAt` desc.
   */
  findRecentByCustomerEmail(input: {
    email: string;
    excludeId: TicketId;
    limit: number;
  }): Promise<Ticket[]>;

  /**
   * Conta de tickets por (escopo, status). Usado pros badges das tabs
   * do Kintal (inbox: novos / em andamento / todos; outbox total).
   */
  countByBoxAndStatus(): Promise<CountsByBox>;
}
