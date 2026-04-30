import type { Ticket } from "./ticket.js";
import { TicketId } from "./ticket-id.js";
import type { TicketKind } from "./ticket-kind.js";
import type { TicketStatus } from "./ticket-status.js";

export interface ListTicketsOptions {
  /** Filtrar por kind (support/general). Sem filtro = todos. */
  kind?: TicketKind;
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

  /**
   * Fallback de threading quando In-Reply-To não bate: busca tickets do
   * mesmo email do cliente nas últimas 24h. Cobre o caso "cliente
   * respondeu mas o cliente de email apagou os headers".
   */
  findRecentByCustomerEmail(
    email: string,
    sinceMs: number,
  ): Promise<Ticket[]>;

  list(opts?: ListTicketsOptions): Promise<Ticket[]>;

  /**
   * Conta de tickets por status (e opcionalmente por kind) — usado pra
   * badge "N abertos" na UI staff. Em kind=general, "open" = todos
   * (não fechamos inbox); o que importa é unread por user (cálculo
   * separado feito na app layer).
   */
  countByStatus(status: TicketStatus, kind?: TicketKind): Promise<number>;

  /**
   * Conta de tickets em kind=general que **não foram lidos** por um
   * user específico. Usado pro badge "N na caixa de entrada" no
   * sidebar do Kintal.
   */
  countUnreadByUser(userId: string): Promise<number>;
}
