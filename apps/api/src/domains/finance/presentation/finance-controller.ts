import type { RequestHandler } from "express";
import type { GetFinancialSummaryUseCase } from "../application/get-financial-summary.js";
import type { CreateExpenseUseCase } from "../application/create-expense.js";
import type { DeleteExpenseUseCase } from "../application/delete-expense.js";
import type { ListExpensesUseCase } from "../application/list-expenses.js";
import {
  createExpenseBody,
  expenseIdParams,
  parsePeriod,
  periodQuery,
} from "./finance-schemas.js";

interface Deps {
  getSummary: GetFinancialSummaryUseCase;
  createExpense: CreateExpenseUseCase;
  deleteExpense: DeleteExpenseUseCase;
  listExpenses: ListExpensesUseCase;
}

export class FinanceController {
  constructor(private readonly deps: Deps) {}

  getSummary: RequestHandler = async (req, res, next) => {
    try {
      const period = parsePeriod(periodQuery.parse(req.query));
      const summary = await this.deps.getSummary.execute({ period });
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };

  listExpenses: RequestHandler = async (req, res, next) => {
    try {
      const period = parsePeriod(periodQuery.parse(req.query));
      const items = await this.deps.listExpenses.execute({ period });
      res.json({ expenses: items });
    } catch (err) {
      next(err);
    }
  };

  createExpense: RequestHandler = async (req, res, next) => {
    try {
      const body = createExpenseBody.parse(req.body);
      const actorUserId = req.auth!.realUserId;
      const result = await this.deps.createExpense.execute({
        category: body.category,
        description: body.description,
        amountCents: body.amountCents,
        occurredAt: body.occurredAt,
        createdByUserId: actorUserId,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  deleteExpense: RequestHandler = async (req, res, next) => {
    try {
      const { expenseId } = expenseIdParams.parse(req.params);
      await this.deps.deleteExpense.execute({ expenseId });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
