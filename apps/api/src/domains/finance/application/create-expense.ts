import type { ExpenseRepository } from "../domain/expense-repository.js";
import type { ExpenseCategory } from "../domain/expense-category.js";
import { Expense } from "../domain/expense.js";

export interface CreateExpenseInput {
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  occurredAt: Date;
  createdByUserId: string;
}

export interface CreateExpenseOutput {
  id: string;
}

export class CreateExpenseUseCase {
  constructor(private readonly expenses: ExpenseRepository) {}

  async execute(input: CreateExpenseInput): Promise<CreateExpenseOutput> {
    const expense = Expense.create({
      id: this.expenses.nextId(),
      category: input.category,
      description: input.description,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      createdByUserId: input.createdByUserId,
    });
    await this.expenses.save(expense);
    return { id: expense.id.toString() };
  }
}
