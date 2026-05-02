/**
 * Categorias de despesa. A flag `affectsNetRevenue` distingue custos de
 * transação (taxas de gateway, impostos retidos sobre a venda) — que
 * abatem o faturamento bruto pra dar o líquido — das despesas
 * operacionais (hospedagem, salários, etc.) que contam só como "gastos"
 * e não afetam o líquido. Lucro = líquido − despesas operacionais (não
 * é exibido nesta versão, mas a separação já permite isso depois).
 */
export type ExpenseCategory =
  | "stripe_fee"
  | "tax"
  | "infrastructure"
  | "software"
  | "ai_inference"
  | "payroll"
  | "marketing"
  | "other";

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "stripe_fee",
  "tax",
  "infrastructure",
  "software",
  "ai_inference",
  "payroll",
  "marketing",
  "other",
] as const;

const TRANSACTION_COSTS: ReadonlySet<ExpenseCategory> = new Set([
  "stripe_fee",
  "tax",
]);

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function affectsNetRevenue(category: ExpenseCategory): boolean {
  return TRANSACTION_COSTS.has(category);
}
