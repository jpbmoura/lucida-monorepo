import { LedgerEntryId } from "./ledger-entry-id.js";
import { WalletId } from "./wallet-id.js";
import type { BillingScope } from "./billing-scope.js";

export type LedgerType = "credit" | "debit";

/**
 * Razões possíveis pra uma entrada no ledger. O conjunto é fechado —
 * adicionar novos exige atualizar o schema + reconciliações.
 */
export type LedgerReason =
  | "welcome_bonus"
  | "subscription_renewal"
  | "topup_purchase"
  | "promo_grant"
  | "ai_consumption"
  | "expiration"
  | "refund"
  | "adjustment"
  | "admin_grant";

export interface LedgerEntryProps {
  id: LedgerEntryId;
  scope: BillingScope;
  ownerId: string;
  /**
   * User humano que disparou a ação. Relevante em scope=org pra preservar
   * "quem consumiu o que" do pool. Em scope=user geralmente igual a
   * ownerId, pode ser null quando a movimentação é sistêmica (ex: renewal).
   */
  actorUserId: string | null;
  walletId: WalletId;
  walletSource: string; // snapshot da source da wallet na hora do lançamento
  type: LedgerType;
  amount: number; // sempre positivo — o tipo determina sinal conceitual
  reason: LedgerReason;
  /** Ação alvo (ex.: "generate_exam", "regenerate_question"). */
  relatedAction: string | null;
  /** Tokens consumidos na ação (quando type=debit/ai_consumption). */
  tokensUsed: number | null;
  /**
   * Agrupador de lançamentos num período de cobrança (pay_per_use futuro).
   * Null pra prepaid — lançamentos ficam "soltos" no tempo.
   */
  billingPeriodId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Entrada de ledger — imutável após criação. Representa uma mutação
 * atômica de saldo pra fins de auditoria. Nunca atualize uma entry;
 * se precisar corrigir, lance uma nova de tipo "adjustment".
 */
export class LedgerEntry {
  private constructor(private readonly props: LedgerEntryProps) {}

  static create(input: {
    id: LedgerEntryId;
    /** Default `"user"` pra retrocompat dos callers existentes. */
    scope?: BillingScope;
    ownerId: string;
    actorUserId?: string | null;
    walletId: WalletId;
    walletSource: string;
    type: LedgerType;
    amount: number;
    reason: LedgerReason;
    relatedAction?: string | null;
    tokensUsed?: number | null;
    billingPeriodId?: string | null;
    metadata?: Record<string, unknown>;
    now?: Date;
  }): LedgerEntry {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error("Ledger amount precisa ser inteiro positivo.");
    }
    return new LedgerEntry({
      id: input.id,
      scope: input.scope ?? "user",
      ownerId: input.ownerId,
      actorUserId: input.actorUserId ?? null,
      walletId: input.walletId,
      walletSource: input.walletSource,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      relatedAction: input.relatedAction ?? null,
      tokensUsed: input.tokensUsed ?? null,
      billingPeriodId: input.billingPeriodId ?? null,
      metadata: input.metadata ?? {},
      createdAt: input.now ?? new Date(),
    });
  }

  static restore(props: LedgerEntryProps): LedgerEntry {
    return new LedgerEntry({ ...props });
  }

  get id(): LedgerEntryId {
    return this.props.id;
  }
  get scope(): BillingScope {
    return this.props.scope;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get actorUserId(): string | null {
    return this.props.actorUserId;
  }
  get walletId(): WalletId {
    return this.props.walletId;
  }
  get walletSource(): string {
    return this.props.walletSource;
  }
  get type(): LedgerType {
    return this.props.type;
  }
  get amount(): number {
    return this.props.amount;
  }
  get reason(): LedgerReason {
    return this.props.reason;
  }
  get relatedAction(): string | null {
    return this.props.relatedAction;
  }
  get tokensUsed(): number | null {
    return this.props.tokensUsed;
  }
  get billingPeriodId(): string | null {
    return this.props.billingPeriodId;
  }
  get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
