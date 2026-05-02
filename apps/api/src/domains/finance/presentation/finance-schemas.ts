import { z } from "zod";
import { EXPENSE_CATEGORIES } from "../domain/expense-category.js";
import {
  type FinancePeriod,
} from "../domain/finance-period.js";
import { InvalidFinancePeriodError } from "../domain/finance-errors.js";

const categoryEnum = z.enum([
  EXPENSE_CATEGORIES[0]!,
  ...EXPENSE_CATEGORIES.slice(1),
]);

/**
 * Period vem como query string flat:
 *   ?kind=month&year=2026&month=5
 *   ?kind=quarter&year=2026&quarter=2
 *   ?kind=year&year=2026
 *
 * Tudo coerced — `req.query` chega como string. A validação fina (mês 1-12,
 * trimestre 1-4) é feita aqui pra falhar cedo com 400.
 */
export const periodQuery = z.object({
  kind: z.enum(["month", "quarter", "year"]),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
});

export type PeriodQuery = z.infer<typeof periodQuery>;

export function parsePeriod(input: PeriodQuery): FinancePeriod {
  switch (input.kind) {
    case "month": {
      if (input.month === undefined) {
        throw new InvalidFinancePeriodError(
          "Período mensal precisa do campo `month`.",
        );
      }
      return { kind: "month", year: input.year, month: input.month };
    }
    case "quarter": {
      if (input.quarter === undefined) {
        throw new InvalidFinancePeriodError(
          "Período trimestral precisa do campo `quarter`.",
        );
      }
      return { kind: "quarter", year: input.year, quarter: input.quarter };
    }
    case "year":
      return { kind: "year", year: input.year };
  }
}

export const createExpenseBody = z.object({
  category: categoryEnum,
  description: z.string().min(1).max(500),
  amountCents: z.number().int().positive(),
  /** ISO date — string ou Date convertem. */
  occurredAt: z.coerce.date(),
});

export const expenseIdParams = z.object({
  expenseId: z.string().min(1),
});
