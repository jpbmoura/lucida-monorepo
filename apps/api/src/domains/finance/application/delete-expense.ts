import type { ExpenseRepository } from "../domain/expense-repository.js";
import { ExpenseId } from "../domain/expense-id.js";
import { ExpenseNotFoundError } from "../domain/finance-errors.js";

export class DeleteExpenseUseCase {
  constructor(private readonly expenses: ExpenseRepository) {}

  async execute(input: { expenseId: string }): Promise<void> {
    const id = ExpenseId.of(input.expenseId);
    const existing = await this.expenses.findById(id);
    if (!existing) throw new ExpenseNotFoundError();
    await this.expenses.delete(id);
  }
}
