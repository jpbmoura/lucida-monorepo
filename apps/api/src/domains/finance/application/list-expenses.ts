import type { ExpenseRepository } from "../domain/expense-repository.js";
import type { Expense } from "../domain/expense.js";
import {
  resolveRange,
  type FinancePeriod,
} from "../domain/finance-period.js";

export interface ListExpensesInput {
  period: FinancePeriod;
}

export interface ExpenseDto {
  id: string;
  category: string;
  description: string;
  amountCents: number;
  occurredAt: string;
  createdByUserId: string;
  source: string;
  createdAt: string;
}

export class ListExpensesUseCase {
  constructor(private readonly expenses: ExpenseRepository) {}

  async execute(input: ListExpensesInput): Promise<ExpenseDto[]> {
    const range = resolveRange(input.period);
    const items = await this.expenses.listInRange(range);
    return items.map(toDto);
  }
}

function toDto(e: Expense): ExpenseDto {
  return {
    id: e.id.toString(),
    category: e.category,
    description: e.description,
    amountCents: e.amountCents,
    occurredAt: e.occurredAt.toISOString(),
    createdByUserId: e.createdByUserId,
    source: e.source,
    createdAt: e.createdAt.toISOString(),
  };
}
