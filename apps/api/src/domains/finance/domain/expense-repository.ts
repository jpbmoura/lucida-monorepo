import type { Expense } from "./expense.js";
import type { ExpenseId } from "./expense-id.js";
import type { ExpenseCategory } from "./expense-category.js";

export interface ExpensesByCategoryAggregate {
  category: ExpenseCategory;
  totalCents: number;
  count: number;
}

export interface ExpensesMonthlyAggregate {
  /** Mês 1-12. Ano vem implícito do range consultado. */
  month: number;
  totalCents: number;
}

export interface ExpenseRepository {
  nextId(): ExpenseId;
  save(expense: Expense): Promise<void>;
  findById(id: ExpenseId): Promise<Expense | null>;
  delete(id: ExpenseId): Promise<void>;

  /**
   * Lista despesas no intervalo `[from, to)` ordenadas por `occurredAt`
   * desc. Sem paginação por agora — backoffice manual, volume baixo.
   */
  listInRange(range: { from: Date; to: Date }): Promise<Expense[]>;

  /** Soma agrupada por categoria no intervalo. */
  aggregateByCategory(range: {
    from: Date;
    to: Date;
  }): Promise<ExpensesByCategoryAggregate[]>;

  /**
   * Soma mensal dentro do range — usado pra barras quando filtro=ano.
   * Devolve apenas meses com despesa; meses zero ficam de fora e o caller
   * preenche com 0.
   */
  aggregateMonthly(range: {
    from: Date;
    to: Date;
  }): Promise<ExpensesMonthlyAggregate[]>;
}
