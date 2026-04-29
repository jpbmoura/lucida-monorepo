import { InvoiceId } from "./invoice-id.js";
import type { InvoiceItem } from "./invoice-item.js";
import type { InvoiceSource } from "./invoice-source.js";
import type { InvoiceStatus } from "./invoice-status.js";
import type { TakerSnapshot } from "./taker-snapshot.js";

export interface InvoiceProps {
  id: InvoiceId;
  /**
   * User que iniciou o pagamento. Sempre presente — quem paga é sempre
   * um user, mesmo quando a NF é da org (aí `organizationId` também
   * preenchido). Útil pra filtros "minhas notas" no /app.
   */
  ownerId: string;
  /**
   * Org tomadora quando a cobrança foi institucional. `null` quando o
   * tomador é o próprio user (caso PF/PJ pessoal). O snapshot fiscal
   * abaixo já reflete a escolha — esse campo é redundante mas explícito,
   * facilita queries por org.
   */
  organizationId: string | null;
  source: InvoiceSource;
  /**
   * Identificador externo único que correlaciona com a transação que
   * gerou a nota. Schema garante unique — webhook reentregue não cria
   * Invoice duplicada.
   */
  externalRef: string;
  status: InvoiceStatus;
  taker: TakerSnapshot;
  items: InvoiceItem[];
  amountCents: number;

  // ─── Estado retornado pelo provider (NFE.io) ─────────────────────────
  providerInvoiceId: string | null;
  providerStatusRaw: string | null;
  rpsNumber: string | null;
  rpsSeries: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;

  // ─── Operacional ─────────────────────────────────────────────────────
  /**
   * Quantas vezes o worker já tentou enviar pra NFE.io. Usado pelo
   * retry/backoff em PR 6. Não é o número de tentativas da prefeitura —
   * isso é responsabilidade do NFE.io.
   */
  attempts: number;
  lastError: string | null;
  /** Snapshot raso de info de origem (planId, topupId, stripeSubscriptionId etc). */
  metadata: Record<string, string>;
  issuedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate root de Invoicing. Imutável fora dos métodos abaixo — toda
 * transição de estado é explícita (markProcessing/markIssued/markFailed)
 * pra evitar criar Invoice em estado inválido por engano.
 *
 * Nunca emite no provider direto — quem chama o NFE.io é o
 * `ProcessPendingInvoicesUseCase` (PR 6). A entidade só guarda o que
 * aconteceu.
 */
export class Invoice {
  private constructor(private props: InvoiceProps) {}

  static create(input: {
    id: InvoiceId;
    ownerId: string;
    organizationId?: string | null;
    source: InvoiceSource;
    externalRef: string;
    taker: TakerSnapshot;
    items: InvoiceItem[];
    amountCents: number;
    metadata?: Record<string, string>;
    now?: Date;
  }): Invoice {
    if (input.items.length === 0) {
      throw new Error("Invoice precisa de pelo menos 1 item.");
    }
    if (input.amountCents <= 0) {
      throw new Error("Invoice precisa ter amountCents > 0.");
    }
    const itemsTotal = input.items.reduce((s, i) => s + i.amountCents, 0);
    if (itemsTotal !== input.amountCents) {
      throw new Error(
        `Soma dos items (${itemsTotal}) difere de amountCents (${input.amountCents}).`,
      );
    }
    const now = input.now ?? new Date();
    return new Invoice({
      id: input.id,
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      source: input.source,
      externalRef: input.externalRef,
      status: "pending",
      taker: input.taker,
      items: input.items,
      amountCents: input.amountCents,
      providerInvoiceId: null,
      providerStatusRaw: null,
      rpsNumber: null,
      rpsSeries: null,
      pdfUrl: null,
      xmlUrl: null,
      attempts: 0,
      lastError: null,
      metadata: input.metadata ?? {},
      issuedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: InvoiceProps): Invoice {
    return new Invoice({ ...props });
  }

  // ─── Getters ──────────────────────────────────────────────────────────
  get id(): InvoiceId {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get organizationId(): string | null {
    return this.props.organizationId;
  }
  get source(): InvoiceSource {
    return this.props.source;
  }
  get externalRef(): string {
    return this.props.externalRef;
  }
  get status(): InvoiceStatus {
    return this.props.status;
  }
  get taker(): TakerSnapshot {
    return this.props.taker;
  }
  get items(): InvoiceItem[] {
    return this.props.items;
  }
  get amountCents(): number {
    return this.props.amountCents;
  }
  get providerInvoiceId(): string | null {
    return this.props.providerInvoiceId;
  }
  get providerStatusRaw(): string | null {
    return this.props.providerStatusRaw;
  }
  get rpsNumber(): string | null {
    return this.props.rpsNumber;
  }
  get rpsSeries(): string | null {
    return this.props.rpsSeries;
  }
  get pdfUrl(): string | null {
    return this.props.pdfUrl;
  }
  get xmlUrl(): string | null {
    return this.props.xmlUrl;
  }
  get attempts(): number {
    return this.props.attempts;
  }
  get lastError(): string | null {
    return this.props.lastError;
  }
  get metadata(): Record<string, string> {
    return this.props.metadata;
  }
  get issuedAt(): Date | null {
    return this.props.issuedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ─── Transições ───────────────────────────────────────────────────────

  /**
   * Worker chamou o NFE.io e recebeu de volta um `providerInvoiceId`.
   * Bumpa attempts independentemente do status retornado — o que conta
   * é "tentamos enviar".
   */
  markProcessing(input: {
    providerInvoiceId: string;
    providerStatusRaw: string;
    pdfUrl?: string | null;
    xmlUrl?: string | null;
    now?: Date;
  }): void {
    this.props.providerInvoiceId = input.providerInvoiceId;
    this.props.providerStatusRaw = input.providerStatusRaw;
    if (input.pdfUrl !== undefined) this.props.pdfUrl = input.pdfUrl ?? null;
    if (input.xmlUrl !== undefined) this.props.xmlUrl = input.xmlUrl ?? null;
    this.props.status = "processing";
    this.props.attempts += 1;
    this.props.lastError = null;
    this.props.updatedAt = input.now ?? new Date();
  }

  /**
   * NFE.io confirmou (via webhook ou polling) que a nota foi autorizada
   * pela prefeitura. PDFs disponíveis pra download.
   */
  markIssued(input: {
    pdfUrl: string;
    xmlUrl: string;
    rpsNumber?: string | null;
    rpsSeries?: string | null;
    providerStatusRaw: string;
    now?: Date;
  }): void {
    const now = input.now ?? new Date();
    this.props.status = "issued";
    this.props.pdfUrl = input.pdfUrl;
    this.props.xmlUrl = input.xmlUrl;
    if (input.rpsNumber !== undefined) this.props.rpsNumber = input.rpsNumber;
    if (input.rpsSeries !== undefined) this.props.rpsSeries = input.rpsSeries;
    this.props.providerStatusRaw = input.providerStatusRaw;
    this.props.issuedAt = now;
    this.props.lastError = null;
    this.props.updatedAt = now;
  }

  /**
   * Falha permanente — dado inválido rejeitado pela prefeitura, código
   * de serviço não aceito etc. Retry não resolve. UI/staff precisa
   * intervir (corrigir input, reemitir manualmente).
   */
  markFailed(input: {
    error: string;
    providerStatusRaw?: string | null;
    now?: Date;
  }): void {
    this.props.status = "failed";
    this.props.lastError = input.error;
    if (input.providerStatusRaw !== undefined) {
      this.props.providerStatusRaw = input.providerStatusRaw ?? null;
    }
    this.props.updatedAt = input.now ?? new Date();
  }

  /**
   * Falha transitória — rede caiu, NFE.io devolveu 5xx. Mantém status
   * (pending|processing) pra retry; só incrementa attempts e registra
   * o erro pra debug. Worker decide quando parar tentando.
   */
  recordTransientFailure(input: { error: string; now?: Date }): void {
    this.props.attempts += 1;
    this.props.lastError = input.error;
    this.props.updatedAt = input.now ?? new Date();
  }

  /**
   * Cancelamento (pós-MVP). Regra municipal limita prazo (geralmente 24h
   * em SP; varia). NFS-e cancelada mantém histórico — não é deletada.
   */
  markCancelled(input: { providerStatusRaw: string; now?: Date }): void {
    const now = input.now ?? new Date();
    this.props.status = "cancelled";
    this.props.providerStatusRaw = input.providerStatusRaw;
    this.props.cancelledAt = now;
    this.props.updatedAt = now;
  }

  // ─── Conveniences ─────────────────────────────────────────────────────

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.props.organizationId === organizationId;
  }

  isTerminal(): boolean {
    return (
      this.props.status === "issued" ||
      this.props.status === "failed" ||
      this.props.status === "cancelled"
    );
  }
}
