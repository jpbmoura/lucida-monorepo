import { PLANS, type PlanId } from "@/domains/billing/domain/plan.js";
import { TOPUPS, type TopupId } from "@/domains/billing/domain/topup.js";
import type {
  KintalReadRepository,
  TopupAggregate,
} from "./ports/kintal-read-repository.js";
import { resolvePeriod, type PeriodScope } from "../domain/period-scope.js";

export interface DashboardMetricsInput {
  period: PeriodScope;
}

export interface KintalDashboardMetrics {
  period: PeriodScope;
  range: { from: string; to: string };
  generatedAt: string;

  // --- Snapshot (agora) ---
  /** Soma das subscriptions ativas convertida pra valor mensal (centavos). */
  mrrCents: number;
  activeSubscriptions: {
    basic: { monthly: number; yearly: number; total: number };
    pro: { monthly: number; yearly: number; total: number };
    total: number;
  };

  // --- Janela ---
  activeUsers: number;
  newUsers: number;
  newSubscribers: number;
  churnRatePct: number;
  topupsInPeriod: {
    byPackage: Record<TopupId, TopupAggregate>;
    totalCount: number;
    totalRevenueCents: number;
  };
}

/**
 * Calcula as métricas do dashboard Kintal pra uma janela `period`. Métricas
 * de snapshot (MRR, assinaturas por tier) são sempre "agora" — não respeitam
 * a janela. Métricas de fluxo (novos users, assinantes, churn, top-ups)
 * usam `[from, to)`.
 *
 * Churn mensal gross: canceladas na janela / ativas no início da janela.
 * Retorna 0 se a base era 0 (evita NaN/Infinity).
 */
export class GetDashboardMetricsUseCase {
  constructor(private readonly read: KintalReadRepository) {}

  async execute(input: DashboardMetricsInput): Promise<KintalDashboardMetrics> {
    const now = new Date();
    const { from, to } = resolvePeriod(input.period, now);

    const [
      activeByPlan,
      newUsers,
      activeUsers,
      newSubscribers,
      canceledInRange,
      activeAtWindowStart,
      topupsByPkg,
    ] = await Promise.all([
      this.read.countActiveSubscriptionsByPlan(),
      this.read.countNewUsers({ from, to }),
      this.read.countActiveUsers({ from, to }),
      this.read.countNewSubscribers({ from, to }),
      this.read.countCanceledSubscriptions({ from, to }),
      this.read.countSubscriptionsActiveAt(from),
      this.read.aggregateTopupsInRange({ from, to }),
    ]);

    const mrrCents = computeMrrCents(activeByPlan);
    const activeSubscriptions = summariseSubscriptions(activeByPlan);
    const churnRatePct =
      activeAtWindowStart === 0
        ? 0
        : (canceledInRange / activeAtWindowStart) * 100;

    const topupTotals = Object.values(topupsByPkg).reduce(
      (acc, t) => ({
        count: acc.count + t.count,
        revenueCents: acc.revenueCents + t.revenueCents,
      }),
      { count: 0, revenueCents: 0 },
    );

    return {
      period: input.period,
      range: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: now.toISOString(),
      mrrCents,
      activeSubscriptions,
      activeUsers,
      newUsers,
      newSubscribers,
      churnRatePct: round2(churnRatePct),
      topupsInPeriod: {
        byPackage: topupsByPkg,
        totalCount: topupTotals.count,
        totalRevenueCents: topupTotals.revenueCents,
      },
    };
  }
}

function computeMrrCents(byPlan: Record<PlanId, number>): number {
  let total = 0;
  for (const [planId, count] of Object.entries(byPlan) as [PlanId, number][]) {
    const plan = PLANS[planId];
    if (!plan) continue;
    const monthlyPrice =
      plan.period === "yearly" ? plan.priceCents / 12 : plan.priceCents;
    total += monthlyPrice * count;
  }
  return Math.round(total);
}

function summariseSubscriptions(byPlan: Record<PlanId, number>) {
  const basicMonthly = byPlan.basic_monthly ?? 0;
  const basicYearly = byPlan.basic_yearly ?? 0;
  const proMonthly = byPlan.pro_monthly ?? 0;
  const proYearly = byPlan.pro_yearly ?? 0;
  const basicTotal = basicMonthly + basicYearly;
  const proTotal = proMonthly + proYearly;
  return {
    basic: { monthly: basicMonthly, yearly: basicYearly, total: basicTotal },
    pro: { monthly: proMonthly, yearly: proYearly, total: proTotal },
    total: basicTotal + proTotal,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Re-export pra ajudar o controller tipado.
export { TOPUPS };
