import type {
  ExpenseRepository,
  ExpensesByCategoryAggregate,
} from "../domain/expense-repository.js";
import type {
  RevenueSource,
  RevenueSummary,
} from "../domain/revenue-source.js";
import {
  EXPENSE_CATEGORIES,
  affectsNetRevenue,
  type ExpenseCategory,
} from "../domain/expense-category.js";
import {
  periodCompletion,
  previousPeriod,
  resolveRange,
  type FinancePeriod,
} from "../domain/finance-period.js";

export interface GetFinancialSummaryInput {
  period: FinancePeriod;
  /** Override pra testes; em prod = `new Date()`. */
  now?: Date;
}

export interface CategoryBreakdownItem {
  category: ExpenseCategory;
  totalCents: number;
  count: number;
}

export interface MonthlyBucket {
  month: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  expensesCents: number;
  subscriptionsCents: number;
  topupsCents: number;
}

export interface PeriodTotals {
  grossRevenueCents: number;
  /** Bruto − despesas com `affectsNetRevenue` (stripe_fee + tax). */
  netRevenueCents: number;
  expensesCents: number;
  /**
   * Subset das despesas que abateram o líquido — útil pra UI explicar
   * por que líquido < bruto.
   */
  transactionCostsCents: number;
  subscriptionsCents: number;
  topupsCents: number;
}

export interface ProjectionInfo {
  /** True se o período ainda não fechou — projeção faz sentido. */
  isOpen: boolean;
  /** % decorrido do período (0..1). */
  fractionElapsed: number;
  /**
   * Estimativa de bruto pro fim do período via extrapolação linear.
   * `null` quando período já fechou ou não tem dados pra projetar.
   */
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
  /** Variação % vs período anterior. `null` quando o período anterior é 0
   *  (evita divisão por zero / Infinity na UI). */
  delta: {
    grossRevenuePct: number | null;
    netRevenuePct: number | null;
    expensesPct: number | null;
  };
  projection: ProjectionInfo;
  /**
   * Série mensal cobrindo todos os meses do range. Pra `kind=month`
   * tem 1 bucket; pra `quarter` tem 3; pra `year` tem 12.
   */
  monthly: MonthlyBucket[];
  expensesByCategory: CategoryBreakdownItem[];
}

/**
 * Caso de uso central do dashboard financeiro. Tira a foto do período
 * (bruto/líquido/gastos), comparativo com período anterior, projeção pro
 * fim do período em curso, série mensal e breakdown de despesas por
 * categoria. Tudo em um round-trip — frontend pinta com os dados que
 * receber.
 */
export class GetFinancialSummaryUseCase {
  constructor(
    private readonly revenue: RevenueSource,
    private readonly expenses: ExpenseRepository,
  ) {}

  async execute(input: GetFinancialSummaryInput): Promise<FinancialSummary> {
    const now = input.now ?? new Date();
    const range = resolveRange(input.period);
    const prevRange = resolveRange(previousPeriod(input.period));

    const [
      revenueNow,
      revenueMonthly,
      expenseAggCategoryNow,
      expenseMonthlyNow,
      revenuePrev,
      expenseAggCategoryPrev,
    ] = await Promise.all([
      this.revenue.totalInRange(range),
      this.revenue.monthlyInRange(range),
      this.expenses.aggregateByCategory(range),
      this.expenses.aggregateMonthly(range),
      this.revenue.totalInRange(prevRange),
      this.expenses.aggregateByCategory(prevRange),
    ]);

    const current = computeTotals(revenueNow, expenseAggCategoryNow);
    const previous = computeTotals(revenuePrev, expenseAggCategoryPrev);

    const completion = periodCompletion(input.period, now);
    const projection = projectTotals(current, completion);

    const monthly = buildMonthlyBuckets(input.period, revenueMonthly, expenseMonthlyNow);

    const expensesByCategory = mergeCategories(expenseAggCategoryNow);

    return {
      period: input.period,
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      generatedAt: now.toISOString(),
      current,
      previous,
      delta: {
        grossRevenuePct: pctDelta(current.grossRevenueCents, previous.grossRevenueCents),
        netRevenuePct: pctDelta(current.netRevenueCents, previous.netRevenueCents),
        expensesPct: pctDelta(current.expensesCents, previous.expensesCents),
      },
      projection,
      monthly,
      expensesByCategory,
    };
  }
}

function computeTotals(
  revenue: RevenueSummary,
  expenseAgg: ExpensesByCategoryAggregate[],
): PeriodTotals {
  let expensesCents = 0;
  let transactionCostsCents = 0;
  for (const row of expenseAgg) {
    expensesCents += row.totalCents;
    if (affectsNetRevenue(row.category)) transactionCostsCents += row.totalCents;
  }
  return {
    grossRevenueCents: revenue.totalCents,
    netRevenueCents: revenue.totalCents - transactionCostsCents,
    expensesCents,
    transactionCostsCents,
    subscriptionsCents: revenue.subscriptionsCents,
    topupsCents: revenue.topupsCents,
  };
}

function projectTotals(
  current: PeriodTotals,
  completion: { isOpen: boolean; fraction: number; isFuture: boolean },
): ProjectionInfo {
  const base: ProjectionInfo = {
    isOpen: completion.isOpen,
    fractionElapsed: completion.fraction,
    projectedGrossRevenueCents: null,
    projectedNetRevenueCents: null,
    projectedExpensesCents: null,
  };
  // Fechado ou ainda não começou → sem projeção. Fração muito pequena (< 1%)
  // gera ruído absurdo — corte segura.
  if (!completion.isOpen || completion.isFuture) return base;
  if (completion.fraction < 0.01) return base;
  const factor = 1 / completion.fraction;
  return {
    ...base,
    projectedGrossRevenueCents: Math.round(current.grossRevenueCents * factor),
    projectedNetRevenueCents: Math.round(current.netRevenueCents * factor),
    projectedExpensesCents: Math.round(current.expensesCents * factor),
  };
}

function buildMonthlyBuckets(
  period: FinancePeriod,
  revenueMonthly: { month: number; subscriptionsCents: number; topupsCents: number; totalCents: number }[],
  expenseMonthly: { month: number; totalCents: number }[],
): MonthlyBucket[] {
  const months = monthsInPeriod(period);
  const revByMonth = new Map(revenueMonthly.map((r) => [r.month, r]));
  const expByMonth = new Map(expenseMonthly.map((e) => [e.month, e.totalCents]));
  return months.map((m) => {
    const rev = revByMonth.get(m);
    const subs = rev?.subscriptionsCents ?? 0;
    const top = rev?.topupsCents ?? 0;
    const gross = subs + top;
    const exp = expByMonth.get(m) ?? 0;
    // No bucket mensal, sem detalhamento de stripe_fee/tax — usamos gross
    // como proxy de líquido (nada abatido) pra manter o mensal simples.
    // O líquido total agregado é exato; aqui é só pra visualização.
    return {
      month: m,
      grossRevenueCents: gross,
      netRevenueCents: gross,
      expensesCents: exp,
      subscriptionsCents: subs,
      topupsCents: top,
    };
  });
}

function monthsInPeriod(period: FinancePeriod): number[] {
  switch (period.kind) {
    case "month":
      return [period.month];
    case "quarter": {
      const start = (period.quarter - 1) * 3 + 1;
      return [start, start + 1, start + 2];
    }
    case "year":
      return Array.from({ length: 12 }, (_, i) => i + 1);
  }
}

function mergeCategories(
  agg: ExpensesByCategoryAggregate[],
): CategoryBreakdownItem[] {
  // Devolve todas as categorias (mesmo zeradas) em ordem fixa pra UI
  // estável — donut/lista não pula slot quando entra/sai de categoria.
  const byCat = new Map(agg.map((a) => [a.category, a]));
  return EXPENSE_CATEGORIES.map((c) => {
    const entry = byCat.get(c);
    return {
      category: c,
      totalCents: entry?.totalCents ?? 0,
      count: entry?.count ?? 0,
    };
  });
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
