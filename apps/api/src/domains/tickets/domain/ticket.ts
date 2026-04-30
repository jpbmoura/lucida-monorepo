import { TicketId } from "./ticket-id.js";
import type { TicketKind } from "./ticket-kind.js";
import type { TicketOrigin } from "./ticket-origin.js";
import type { TicketStatus } from "./ticket-status.js";
import type { TicketMessage } from "./ticket-message.js";

export interface TicketProps {
  id: TicketId;
  /**
   * `support` → fluxo de helpdesk completo.
   * `general` → caixa de entrada estilo Gmail (read state per-user).
   */
  kind: TicketKind;
  subject: string;
  /**
   * Usado por `kind=support`. Em `kind=general` fica sempre `open`
   * — read state vive em `readByUserIds`.
   */
  status: TicketStatus;
  customerEmail: string;
  customerName: string | null;
  /** ID do user Lucida quando o email do cliente bate com algum cadastro. */
  userId: string | null;
  origin: TicketOrigin;
  messages: TicketMessage[];
  /**
   * IDs dos staff que já leram a última mensagem inbound. Reseta toda
   * vez que cliente manda nova mensagem (todos voltam pro estado
   * "não lido"). Só é populado em `kind=general`.
   */
  readByUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  /** Última mensagem recebida do cliente (pra ordenar fila). */
  lastInboundAt: Date | null;
  /** Última resposta enviada pelo staff/auto. */
  lastOutboundAt: Date | null;
}

/**
 * Aggregate root. Carrega as mensagens junto — volume baixo (5-10
 * tickets/dia, poucas msgs cada) torna lazy loading desnecessário.
 *
 * Transições:
 *  - `addInboundMessage` → reabre se estava closed; bumpa lastInboundAt.
 *  - `addOutboundMessage` → bumpa lastOutboundAt; status não muda.
 *  - `close` / `reopen` → toggle manual via UI staff.
 */
export class Ticket {
  private constructor(private props: TicketProps) {}

  static create(input: {
    id: TicketId;
    kind?: TicketKind;
    subject: string;
    customerEmail: string;
    customerName?: string | null;
    userId?: string | null;
    origin: TicketOrigin;
    initialMessage: TicketMessage;
    now?: Date;
  }): Ticket {
    const now = input.now ?? new Date();
    const lastInboundAt =
      input.initialMessage.direction === "inbound" ? now : null;
    const lastOutboundAt =
      input.initialMessage.direction === "outbound" ? now : null;
    return new Ticket({
      id: input.id,
      kind: input.kind ?? "support",
      subject: input.subject,
      status: "open",
      customerEmail: input.customerEmail.toLowerCase(),
      customerName: input.customerName ?? null,
      userId: input.userId ?? null,
      origin: input.origin,
      messages: [input.initialMessage],
      readByUserIds: [],
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      lastInboundAt,
      lastOutboundAt,
    });
  }

  static restore(props: TicketProps): Ticket {
    return new Ticket({
      ...props,
      messages: [...props.messages],
      readByUserIds: [...(props.readByUserIds ?? [])],
    });
  }

  // ─── Getters ──────────────────────────────────────────────────────────
  get id(): TicketId {
    return this.props.id;
  }
  get kind(): TicketKind {
    return this.props.kind;
  }
  get subject(): string {
    return this.props.subject;
  }
  get status(): TicketStatus {
    return this.props.status;
  }
  get readByUserIds(): string[] {
    return this.props.readByUserIds;
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
  get closedAt(): Date | null {
    return this.props.closedAt;
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
    // Nova mensagem do cliente → todos os staff voltam pro "não lido"
    // (estilo Gmail). Só relevante em kind=general, mas também limpamos
    // pra support pra manter invariante.
    this.props.readByUserIds = [];
    // Cliente respondeu ticket fechado → reabre automático (só support).
    if (this.props.kind === "support" && this.props.status === "closed") {
      this.props.status = "open";
      this.props.closedAt = null;
    }
  }

  /**
   * Marca ticket como lido por um staff específico. Usado por kind=general
   * (caixa de entrada estilo Gmail). No-op se já estava marcado.
   */
  markReadBy(userId: string, now: Date = new Date()): void {
    if (this.props.readByUserIds.includes(userId)) return;
    this.props.readByUserIds = [...this.props.readByUserIds, userId];
    this.props.updatedAt = now;
  }

  /** Inverso de `markReadBy` — staff pode marcar como não lido novamente. */
  markUnreadBy(userId: string, now: Date = new Date()): void {
    const next = this.props.readByUserIds.filter((id) => id !== userId);
    if (next.length === this.props.readByUserIds.length) return;
    this.props.readByUserIds = next;
    this.props.updatedAt = now;
  }

  isReadBy(userId: string): boolean {
    return this.props.readByUserIds.includes(userId);
  }

  addOutboundMessage(msg: TicketMessage, now: Date = new Date()): void {
    this.props.messages.push(msg);
    this.props.lastOutboundAt = now;
    this.props.updatedAt = now;
  }

  close(now: Date = new Date()): void {
    if (this.props.status === "closed") return;
    this.props.status = "closed";
    this.props.closedAt = now;
    this.props.updatedAt = now;
  }

  reopen(now: Date = new Date()): void {
    if (this.props.status === "open") return;
    this.props.status = "open";
    this.props.closedAt = null;
    this.props.updatedAt = now;
  }

  // ─── Conveniences ─────────────────────────────────────────────────────

  /** Última mensagem (para preview na lista). */
  lastMessage(): TicketMessage | null {
    return this.props.messages[this.props.messages.length - 1] ?? null;
  }

  /** True quando a última mensagem é do cliente (staff "deve" resposta). */
  awaitingStaff(): boolean {
    const last = this.lastMessage();
    return last?.direction === "inbound";
  }
}
