import { ExpenseId } from "./expense-id.js";
import type { ExpenseCategory } from "./expense-category.js";

export interface ExpenseProps {
  id: ExpenseId;
  category: ExpenseCategory;
  /** Descrição livre — referência humana. Ex: "Railway — Maio/2026". */
  description: string;
  /** Sempre positivo, em centavos de BRL. */
  amountCents: number;
  /**
   * Data competência da despesa. É o que entra nos cálculos por período —
   * pagamento à vista de uma assinatura anual fica todo no mês do pagto;
   * se quiser provisionar mês-a-mês, lança 12 entries.
   */
  occurredAt: Date;
  /**
   * Quem criou a entrada — staff `userId`. Manual por enquanto; quando
   * entrar tracking automático (Stripe fees via webhook), pode receber
   * um sentinel "system".
   */
  createdByUserId: string;
  /**
   * `manual`: lançamento humano via Kintal. Outros valores ficam pra
   * tracking automático futuro (`auto:stripe_fee`, `auto:openai`, etc.).
   */
  source: string;
  /** Ref externa quando aplicável — ex.: `stripe:bt_xxx` pra balance txn. */
  externalRef: string | null;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Despesa operacional ou custo de transação. Imutável após criação —
 * editar valor cria nova entry de ajuste. Manter a história intacta
 * facilita conciliação futura.
 */
export class Expense {
  private constructor(private readonly props: ExpenseProps) {}

  static create(input: {
    id: ExpenseId;
    category: ExpenseCategory;
    description: string;
    amountCents: number;
    occurredAt: Date;
    createdByUserId: string;
    source?: string;
    externalRef?: string | null;
    metadata?: Record<string, string>;
    now?: Date;
  }): Expense {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("Despesa precisa ter amountCents inteiro positivo.");
    }
    const description = input.description.trim();
    if (description.length === 0) {
      throw new Error("Descrição da despesa não pode ser vazia.");
    }
    const now = input.now ?? new Date();
    return new Expense({
      id: input.id,
      category: input.category,
      description,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      createdByUserId: input.createdByUserId,
      source: input.source ?? "manual",
      externalRef: input.externalRef ?? null,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ExpenseProps): Expense {
    return new Expense({ ...props });
  }

  get id(): ExpenseId {
    return this.props.id;
  }
  get category(): ExpenseCategory {
    return this.props.category;
  }
  get description(): string {
    return this.props.description;
  }
  get amountCents(): number {
    return this.props.amountCents;
  }
  get occurredAt(): Date {
    return this.props.occurredAt;
  }
  get createdByUserId(): string {
    return this.props.createdByUserId;
  }
  get source(): string {
    return this.props.source;
  }
  get externalRef(): string | null {
    return this.props.externalRef;
  }
  get metadata(): Record<string, string> {
    return { ...this.props.metadata };
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
