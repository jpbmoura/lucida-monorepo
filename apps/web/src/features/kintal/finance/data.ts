"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  ExpenseCategory,
  ExpenseDto,
  FinancePeriod,
  FinancialSummary,
} from "./types";
import { periodToSearchParams } from "./period";

const FINANCE_PATH = "/kintal/financeiro";

export async function fetchFinancialSummary(
  period: FinancePeriod,
): Promise<FinancialSummary> {
  const qs = periodToSearchParams(period).toString();
  return apiFetch<FinancialSummary>(`/api/kintal/finance/summary?${qs}`);
}

export async function fetchExpenses(period: FinancePeriod): Promise<ExpenseDto[]> {
  const qs = periodToSearchParams(period).toString();
  const data = await apiFetch<{ expenses: ExpenseDto[] }>(
    `/api/kintal/finance/expenses?${qs}`,
  );
  return data.expenses;
}

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

export async function createExpenseAction(input: {
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  occurredAt: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const data = await apiFetch<{ id: string }>("/api/kintal/finance/expenses", {
      method: "POST",
      body: input,
    });
    revalidatePath(FINANCE_PATH);
    return { ok: true, data };
  } catch (err) {
    return toResult(err) as ActionResult<{ id: string }>;
  }
}

export async function deleteExpenseAction(
  expenseId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/finance/expenses/${encodeURIComponent(expenseId)}`,
      { method: "DELETE" },
    );
    revalidatePath(FINANCE_PATH);
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

function toResult<T = void>(err: unknown): ActionResult<T> {
  if (err instanceof ApiError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente novamente.",
  };
}
