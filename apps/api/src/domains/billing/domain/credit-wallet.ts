import { WalletId } from "./wallet-id.js";
import type { CreditSource } from "./credit-source.js";
import type { BillingScope } from "./billing-scope.js";
import { InvalidCreditAmountError } from "./billing-errors.js";

export interface CreditWalletProps {
  id: WalletId;
  /** `"user"` pra wallet pessoal; `"org"` pra pool institucional. */
  scope: BillingScope;
  ownerId: string;
  source: CreditSource;
  balance: number;
  /** Data de expiração; null = nunca expira. */
  expiresAt: Date | null;
  /** Referência externa pra reconciliar com Stripe ou outro sistema. */
  externalRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Uma carteira representa um "balde" de créditos de uma única origem.
 * Um usuário pode ter várias carteiras simultâneas (ex.: welcome + subscription
 * + um topup avulso). O débito varre as carteiras em ordem de prioridade.
 *
 * Saldo é imutável via getter — mudanças só via credit()/debit() que validam
 * não-negatividade. Persistência usa atualização atômica (ver repositório).
 */
export class CreditWallet {
  private constructor(private props: CreditWalletProps) {}

  static create(input: {
    id: WalletId;
    /** Default `"user"` pra retrocompat dos callers existentes. */
    scope?: BillingScope;
    ownerId: string;
    source: CreditSource;
    initialBalance: number;
    expiresAt?: Date | null;
    externalRef?: string | null;
    now?: Date;
  }): CreditWallet {
    if (
      !Number.isFinite(input.initialBalance) ||
      input.initialBalance < 0 ||
      !Number.isInteger(input.initialBalance)
    ) {
      throw new InvalidCreditAmountError(
        "Saldo inicial precisa ser inteiro não-negativo.",
      );
    }
    const now = input.now ?? new Date();
    return new CreditWallet({
      id: input.id,
      scope: input.scope ?? "user",
      ownerId: input.ownerId,
      source: input.source,
      balance: input.initialBalance,
      expiresAt: input.expiresAt ?? null,
      externalRef: input.externalRef ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: CreditWalletProps): CreditWallet {
    return new CreditWallet({ ...props });
  }

  get id(): WalletId {
    return this.props.id;
  }
  get scope(): BillingScope {
    return this.props.scope;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get source(): CreditSource {
    return this.props.source;
  }
  get balance(): number {
    return this.props.balance;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }
  get externalRef(): string | null {
    return this.props.externalRef;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt !== null && this.props.expiresAt <= now;
  }
}
