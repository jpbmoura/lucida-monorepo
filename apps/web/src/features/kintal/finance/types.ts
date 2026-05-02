// Espelhos dos tipos do backend `apps/api/src/domains/finance/*`. Mantemos
// duplicado por enquanto porque ainda não existe `packages/` compartilhado.

export type FinancePeriodKind = "month" | "quarter" | "year";

export type FinancePeriod =
  | { kind: "month"; year: number; month: number }
  | { kind: "quarter"; year: number; quarter: number }
  | { kind: "year"; year: number };

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
];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  stripe_fee: "Taxa Stripe",
  tax: "Impostos",
  infrastructure: "Infraestrutura",
  software: "Ferramentas",
  ai_inference: "IA / OpenAI",
  payroll: "Pessoas",
  marketing: "Marketing",
  other: "Outros",
};

/** Categorias que abatem o líquido (custo direto da venda). */
export const TRANSACTION_COST_CATEGORIES: ReadonlySet<ExpenseCategory> = new Set([
  "stripe_fee",
  "tax",
]);

export interface PeriodTotals {
  grossRevenueCents: number;
  netRevenueCents: number;
  expensesCents: number;
  transactionCostsCents: number;
  subscriptionsCents: number;
  topupsCents: number;
}

export interface MonthlyBucket {
  month: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  expensesCents: number;
  subscriptionsCents: number;
  topupsCents: number;
}

export interface CategoryBreakdownItem {
  category: ExpenseCategory;
  totalCents: number;
  count: number;
}

export interface ProjectionInfo {
  isOpen: boolean;
  fractionElapsed: number;
  projectedGrossRevenueCents: number | null;
  projectedNetRevenueCents: number | null;
  projectedExpensesCents: number | null;
}

export interface FinancialSummary {
  period: FinancePeriod;
  range: { from: string; to: string };
  generatedAt: string;
  current: PeriodTotals;
  previous: PeriodTotals;
  delta: {
    grossRevenuePct: number | null;
    netRevenuePct: number | null;
    expensesPct: number | null;
  };
  projection: ProjectionInfo;
  monthly: MonthlyBucket[];
  expensesByCategory: CategoryBreakdownItem[];
}

export interface ExpenseDto {
  id: string;
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  occurredAt: string;
  createdByUserId: string;
  source: string;
  createdAt: string;
}
