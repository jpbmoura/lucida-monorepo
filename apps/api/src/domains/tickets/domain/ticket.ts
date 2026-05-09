import { TicketId } from "./ticket-id.js";
import type { TicketOrigin } from "./ticket-origin.js";
import type { TicketStatus } from "./ticket-status.js";
import type { TicketMessage } from "./ticket-message.js";

export interface TicketProps {
  id: TicketId;
  subject: string;
  status: TicketStatus;
  customerEmail: string;
  customerName: string | null;
  /** ID do user Lucida quando o email do cliente bate com algum cadastro. */
  userId: string | null;
  origin: TicketOrigin;
  messages: TicketMessage[];
  createdAt: Date;
  updatedAt: Date;
  /** Quando o staff marcou como `done`. Reseta pra null ao reabrir. */
  doneAt: Date | null;
  /** Última mensagem recebida do cliente (pra ordenar fila). */
  lastInboundAt: Date | null;
  /** Última resposta enviada pelo staff. */
  lastOutboundAt: Date | null;
}

/**
 * Aggregate root. Carrega as mensagens junto — volume baixo (poucos
 * tickets/dia, poucas msgs cada) torna lazy loading desnecessário.
 *
 * Máquina de estados:
 *   new ──(staff responde)──▶ in_progress ──(staff conclui)──▶ done
 *                                  ▲                              │
 *                                  │                              │
 *                                  └────(cliente responde)────────┤
 *                                  ▲                              │
 *                                  └────(cliente responde)──── read
 *                                                                 ▲
 *                                            (staff arquiva)──────┘
 *
 *  - `addInboundMessage`  → reabre se estava `done` ou `read` (volta pra in_progress).
 *  - `addOutboundMessage` (staff) → se estava `new`, vira in_progress.
 *  - `markDone` / `markRead` / `reopen` → toggle manual via UI staff.
 *
 *  `done` e `read` são ambos terminais. Diferença:
 *  - `done` = resolvido após ação (respondi e fechei).
 *  - `read` = arquivado sem necessidade de resposta (notificação automática,
 *    marketing, etc).
 */
export class Ticket {
  private constructor(private props: TicketProps) {}

  static create(input: {
    id: TicketId;
    subject: string;
    customerEmail: string;
    customerName?: string | null;
    userId?: string | null;
    origin: TicketOrigin;
    initialMessage: TicketMessage;
    /**
     * Status inicial. Default `"new"` (caminho clássico: cliente abriu,
     * staff ainda não viu). Pra ticket iniciado pela equipe via Kintal,
     * passe `"in_progress"` — já há ação do staff, aguardando cliente.
     */
    initialStatus?: TicketStatus;
    now?: Date;
  }): Ticket {
    const now = input.now ?? new Date();
    const lastInboundAt =
      input.initialMessage.direction === "inbound" ? now : null;
    const lastOutboundAt =
      input.initialMessage.direction === "outbound" ? now : null;
    return new Ticket({
      id: input.id,
      subject: input.subject,
      status: input.initialStatus ?? "new",
      customerEmail: input.customerEmail.toLowerCase(),
      customerName: input.customerName ?? null,
      userId: input.userId ?? null,
      origin: input.origin,
      messages: [input.initialMessage],
      createdAt: now,
      updatedAt: now,
      doneAt: null,
      lastInboundAt,
      lastOutboundAt,
    });
  }

  static restore(props: TicketProps): Ticket {
    return new Ticket({
      ...props,
      messages: [...props.messages],
    });
  }

  // ─── Getters ──────────────────────────────────────────────────────────
  get id(): TicketId {
    return this.props.id;
  }
  get subject(): string {
    return this.props.subject;
  }
  get status(): TicketStatus {
    return this.props.status;
  }
  get customerEmail(): string {
    return this.props.customerEmail;
  }
  get customerName(): string | null {
    return this.props.customerName;
  }
  get userId(): string | null {
    return this.props.userId;
  }
  get origin(): TicketOrigin {
    return this.props.origin;
  }
  get messages(): TicketMessage[] {
    return this.props.messages;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get doneAt(): Date | null {
    return this.props.doneAt;
  }
  get lastInboundAt(): Date | null {
    return this.props.lastInboundAt;
  }
  get lastOutboundAt(): Date | null {
    return this.props.lastOutboundAt;
  }

  // ─── Transições ───────────────────────────────────────────────────────

  addInboundMessage(msg: TicketMessage, now: Date = new Date()): void {
    this.props.messages.push(msg);
    this.props.lastInboundAt = now;
    this.props.updatedAt = now;
    // Cliente respondeu um ticket terminal (done/read) → reabre. Não
    // voltamos pra `new` porque a equipe já tocou nele em algum
    // momento; o estado certo é "em andamento de novo".
    if (this.props.status === "done" || this.props.status === "read") {
      this.props.status = "in_progress";
      this.props.doneAt = null;
    }
  }

  addOutboundMessage(msg: TicketMessage, now: Date = new Date()): void {
    this.props.messages.push(msg);
    this.props.lastOutboundAt = now;
    this.props.updatedAt = now;
    // Staff respondeu pela primeira vez → progride pra in_progress.
    if (this.props.status === "new") {
      this.props.status = "in_progress";
    }
  }

  /** Conclui o ticket (= "fechar" / "arquivar"). Idempotente. */
  markDone(now: Date = new Date()): void {
    if (this.props.status === "done") return;
    this.props.status = "done";
    this.props.doneAt = now;
    this.props.updatedAt = now;
  }

  /**
   * Marca como "lido" — terminal igual a `done`, mas semanticamente
   * usado pra emails que não precisam virar thread (notificações
   * automáticas, marketing, etc). Idempotente.
   */
  markRead(now: Date = new Date()): void {
    if (this.props.status === "read") return;
    this.props.status = "read";
    // `doneAt` reseta porque o ticket não foi "concluído via ação";
    // se entrar nas métricas terminal, queremos diferenciar.
    this.props.doneAt = null;
    this.props.updatedAt = now;
  }

  /**
   * Reabertura manual via UI. Volta pra `in_progress` (não pra `new`,
   * porque já passou pela equipe em algum momento). Aceita reopen tanto
   * de `done` quanto de `read`.
   */
  reopen(now: Date = new Date()): void {
    if (this.props.status !== "done" && this.props.status !== "read") return;
    this.props.status = "in_progress";
    this.props.doneAt = null;
    this.props.updatedAt = now;
  }

  // ─── Conveniences ─────────────────────────────────────────────────────

  /** Última mensagem (para preview na lista). */
  lastMessage(): TicketMessage | null {
    return this.props.messages[this.props.messages.length - 1] ?? null;
  }

  /**
   * True quando a última mensagem é do cliente e o ticket não está
   * concluído — staff "deve" resposta. Usado pra badge de prioridade.
   */
  awaitingStaff(): boolean {
    if (this.props.status === "done") return false;
    const last = this.lastMessage();
    return last?.direction === "inbound";
  }
}
