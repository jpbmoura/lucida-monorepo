import type { TopupId } from "./topup.js";

/**
 * Status do espelho local de uma cobrança PIX criada na AbacatePay.
 * Permite o frontend pollar `GET /v1/billing/topup/pix/:id/status` sem
 * bater na API do provedor — a fonte da verdade é o webhook
 * `transparent.completed` que atualiza esse documento.
 *
 * - `PENDING`: criada, aguardando o pagador escanear/colar.
 * - `PAID`:    webhook chegou, créditos já depositados.
 * - `EXPIRED`: passou de `expiresAt` sem pagamento (limpeza opcional via cron).
 * - `FAILED`:  AbacatePay devolveu erro/cancelamento explícito.
 */
export type PixTopupIntentStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";

export interface PixTopupIntentProps {
  /**
   * ID retornado pela AbacatePay (ex.: `pix_char_abc123`). Único — também
   * é a chave usada pra reconciliar o webhook `transparent.completed`.
   */
  abacateId: string;
  ownerId: string;
  topupId: TopupId;
  /** Cópia em centavos no momento da criação — guarda mesmo que o catálogo mude depois. */
  amountCents: number;
  /** CPF/CNPJ só em dígitos, igual ao formato persistido no user. */
  taxId: string;
  status: PixTopupIntentStatus;
  /** Copy-paste PIX (BR Code). Persistido pra exibir de novo se o user reabrir. */
  brCode: string;
  /** PNG em base64 (data URL) — mesmo motivo do brCode. */
  brCodeBase64: string;
  /** Quando a AbacatePay deixa de aceitar o pagamento. */
  expiresAt: Date;
  /** Setado quando webhook PAID chega. */
  paidAt: Date | null;
  /** ID da wallet criada como resultado do pagamento — pra auditoria. */
  walletId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Espelho local de uma cobrança PIX da AbacatePay. Não substitui a fonte
 * de verdade do provedor; serve só pra: (1) o front pollar status sem
 * sair pra AbacatePay, (2) reconciliar o webhook com `ownerId`/`topupId`,
 * (3) reabrir o QR caso o user feche o modal.
 */
export class PixTopupIntent {
  private constructor(private props: PixTopupIntentProps) {}

  static create(input: {
    abacateId: string;
    ownerId: string;
    topupId: TopupId;
    amountCents: number;
    taxId: string;
    brCode: string;
    brCodeBase64: string;
    expiresAt: Date;
    now?: Date;
  }): PixTopupIntent {
    const now = input.now ?? new Date();
    return new PixTopupIntent({
      abacateId: input.abacateId,
      ownerId: input.ownerId,
      topupId: input.topupId,
      amountCents: input.amountCents,
      taxId: input.taxId,
      status: "PENDING",
      brCode: input.brCode,
      brCodeBase64: input.brCodeBase64,
      expiresAt: input.expiresAt,
      paidAt: null,
      walletId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: PixTopupIntentProps): PixTopupIntent {
    return new PixTopupIntent({ ...props });
  }

  /**
   * Marca como PAID e linka a wallet criada no depósito. Idempotente: se
   * já estava PAID, não muda nada (o webhook pode chegar 2x).
   */
  markPaid(input: { walletId: string; paidAt?: Date }): void {
    if (this.props.status === "PAID") return;
    this.props.status = "PAID";
    this.props.paidAt = input.paidAt ?? new Date();
    this.props.walletId = input.walletId;
    this.props.updatedAt = new Date();
  }

  markExpired(): void {
    if (this.props.status !== "PENDING") return;
    this.props.status = "EXPIRED";
    this.props.updatedAt = new Date();
  }

  markFailed(): void {
    if (this.props.status === "PAID") return;
    this.props.status = "FAILED";
    this.props.updatedAt = new Date();
  }

  get abacateId(): string {
    return this.props.abacateId;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get topupId(): TopupId {
    return this.props.topupId;
  }
  get amountCents(): number {
    return this.props.amountCents;
  }
  get taxId(): string {
    return this.props.taxId;
  }
  get status(): PixTopupIntentStatus {
    return this.props.status;
  }
  get brCode(): string {
    return this.props.brCode;
  }
  get brCodeBase64(): string {
    return this.props.brCodeBase64;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get paidAt(): Date | null {
    return this.props.paidAt;
  }
  get walletId(): string | null {
    return this.props.walletId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
