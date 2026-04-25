export type PeriodScope = "today" | "7d" | "30d" | "90d";

export const PERIOD_LABELS: Record<PeriodScope, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
};

export type TopupId = "topup_2k" | "topup_5k" | "topup_15k";

export interface TopupAggregate {
  count: number;
  revenueCents: number;
}

export interface KintalDashboardMetrics {
  period: PeriodScope;
  range: { from: string; to: string };
  generatedAt: string;

  mrrCents: number;
  activeSubscriptions: {
    basic: { monthly: number; yearly: number; total: number };
    pro: { monthly: number; yearly: number; total: number };
    total: number;
  };

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

export function isPeriodScope(value: string): value is PeriodScope {
  return value in PERIOD_LABELS;
}
