import { LedgerEntryModel } from "@/domains/billing/infrastructure/ledger-schema.js";
import { PLANS, type PlanId } from "@/domains/billing/domain/plan.js";
import {
  TOPUPS,
  isTopupId,
  type TopupId,
} from "@/domains/billing/domain/topup.js";
import type {
  RevenueByMonth,
  RevenueSource,
  RevenueSummary,
} from "../domain/revenue-source.js";

/**
 * Implementação de `RevenueSource` em cima do `credit_ledger`. A fonte de
 * verdade pra "quanto entrou em BRL" é cruzar contagem de entries de
 * renewal/topup com o catálogo estático de preços (PLANS, TOPUPS) — o
 * ledger guarda só o crédito depositado, não o valor cobrado.
 *
 * Renewals: agrupa por `metadata.planId` e multiplica pelo `priceCents`
 * vigente. Topups: agrupa por `metadata.topupId` e multiplica pelo
 * `priceCents` do pacote.
 *
 * Limitação consciente: preços são puxados do catálogo *atual*. Mudança
 * de preço retroage no relatório. Aceitável agora porque preços são
 * estáveis; quando isso virar problema, a gente ou (a) registra o valor
 * em centavos no metadata da entry, ou (b) snapshota o priceCents no doc.
 */
export class LedgerRevenueSource implements RevenueSource {
  async totalInRange(range: { from: Date; to: Date }): Promise<RevenueSummary> {
    const [subs, topups] = await Promise.all([
      this.aggregateSubscriptionsTotal(range),
      this.aggregateTopupsTotal(range),
    ]);
    return {
      subscriptionsCents: subs,
      topupsCents: topups,
      totalCents: subs + topups,
    };
  }

  async monthlyInRange(range: {
    from: Date;
    to: Date;
  }): Promise<RevenueByMonth[]> {
    const [subRows, topupRows] = await Promise.all([
      this.aggregateSubscriptionsByMonth(range),
      this.aggregateTopupsByMonth(range),
    ]);

    const subsByMonth = new Map<number, number>();
    for (const r of subRows) {
      const cur = subsByMonth.get(r.month) ?? 0;
      subsByMonth.set(r.month, cur + r.totalCents);
    }
    const topupsByMonth = new Map<number, number>();
    for (const r of topupRows) {
      const cur = topupsByMonth.get(r.month) ?? 0;
      topupsByMonth.set(r.month, cur + r.totalCents);
    }

    const months = new Set<number>([
      ...subsByMonth.keys(),
      ...topupsByMonth.keys(),
    ]);
    const out: RevenueByMonth[] = [];
    for (const m of months) {
      const subs = subsByMonth.get(m) ?? 0;
      const top = topupsByMonth.get(m) ?? 0;
      out.push({
        month: m,
        subscriptionsCents: subs,
        topupsCents: top,
        totalCents: subs + top,
      });
    }
    return out.sort((a, b) => a.month - b.month);
  }

  // ─── helpers ──────────────────────────────────────────────

  private async aggregateSubscriptionsTotal(range: {
    from: Date;
    to: Date;
  }): Promise<number> {
    const rows = await LedgerEntryModel.aggregate<{
      _id: string | null;
      count: number;
    }>([
      {
        $match: {
          reason: "subscription_renewal",
          createdAt: { $gte: range.from, $lt: range.to },
        },
      },
      {
        $group: {
          _id: "$metadata.planId",
          count: { $sum: 1 },
        },
      },
    ]);
    let total = 0;
    for (const r of rows) {
      const plan = lookupPlan(r._id);
      if (!plan) continue;
      total += plan.priceCents * r.count;
    }
    return total;
  }

  private async aggregateTopupsTotal(range: {
    from: Date;
    to: Date;
  }): Promise<number> {
    const rows = await LedgerEntryModel.aggregate<{
      _id: string | null;
      count: number;
    }>([
      {
        $match: {
          reason: "topup_purchase",
          createdAt: { $gte: range.from, $lt: range.to },
        },
      },
      {
        $group: {
          _id: "$metadata.topupId",
          count: { $sum: 1 },
        },
      },
    ]);
    let total = 0;
    for (const r of rows) {
      if (typeof r._id !== "string" || !isTopupId(r._id)) continue;
      total += TOPUPS[r._id satisfies TopupId].priceCents * r.count;
    }
    return total;
  }

  private async aggregateSubscriptionsByMonth(range: {
    from: Date;
    to: Date;
  }): Promise<Array<{ month: number; totalCents: number }>> {
    const rows = await LedgerEntryModel.aggregate<{
      _id: { planId: string | null; month: number };
      count: number;
    }>([
      {
        $match: {
          reason: "subscription_renewal",
          createdAt: { $gte: range.from, $lt: range.to },
        },
      },
      {
        $group: {
          _id: {
            planId: "$metadata.planId",
            month: { $month: { date: "$createdAt", timezone: "UTC" } },
          },
          count: { $sum: 1 },
        },
      },
    ]);
    const out: Array<{ month: number; totalCents: number }> = [];
    for (const r of rows) {
      const plan = lookupPlan(r._id.planId);
      if (!plan) continue;
      out.push({ month: r._id.month, totalCents: plan.priceCents * r.count });
    }
    return out;
  }

  private async aggregateTopupsByMonth(range: {
    from: Date;
    to: Date;
  }): Promise<Array<{ month: number; totalCents: number }>> {
    const rows = await LedgerEntryModel.aggregate<{
      _id: { topupId: string | null; month: number };
      count: number;
    }>([
      {
        $match: {
          reason: "topup_purchase",
          createdAt: { $gte: range.from, $lt: range.to },
        },
      },
      {
        $group: {
          _id: {
            topupId: "$metadata.topupId",
            month: { $month: { date: "$createdAt", timezone: "UTC" } },
          },
          count: { $sum: 1 },
        },
      },
    ]);
    const out: Array<{ month: number; totalCents: number }> = [];
    for (const r of rows) {
      if (typeof r._id.topupId !== "string" || !isTopupId(r._id.topupId)) continue;
      const t = TOPUPS[r._id.topupId satisfies TopupId];
      out.push({ month: r._id.month, totalCents: t.priceCents * r.count });
    }
    return out;
  }
}

function lookupPlan(planId: string | null): { priceCents: number } | null {
  if (!planId) return null;
  if (!(planId in PLANS)) return null;
  return PLANS[planId as PlanId];
}
