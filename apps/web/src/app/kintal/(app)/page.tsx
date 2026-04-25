import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-server-session";
import { buildDisplayUser } from "@/lib/user-display";
import { fetchDashboardMetrics } from "@/features/kintal/dashboard/data";
import {
  PERIOD_LABELS,
  isPeriodScope,
  type PeriodScope,
} from "@/features/kintal/dashboard/types";
import { PageHeader } from "@/features/kintal/dashboard/sections/page-header";
import { KpiGrid } from "@/features/kintal/dashboard/sections/kpi-grid";
import { SubscriptionsPanel } from "@/features/kintal/dashboard/sections/subscriptions-panel";
import { TopupsPanel } from "@/features/kintal/dashboard/sections/topups-panel";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function KintalDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const period: PeriodScope =
    sp.period && isPeriodScope(sp.period) ? sp.period : "30d";
  const windowLabel = `últimos ${PERIOD_LABELS[period].toLowerCase()}`;

  const [session, metrics] = await Promise.all([
    getServerSession(),
    fetchDashboardMetrics(period),
  ]);

  const display = buildDisplayUser({
    name: session?.user.name ?? null,
    email: session?.user.email ?? "equipe@lucida",
  });

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <PageHeader firstName={display.firstName} period={period} />

      <div className="mt-12">
        <KpiGrid metrics={metrics} windowLabel={windowLabel} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SubscriptionsPanel
          data={metrics.activeSubscriptions}
          newSubscribers={metrics.newSubscribers}
          windowLabel={windowLabel}
        />
        <TopupsPanel
          data={metrics.topupsInPeriod}
          windowLabel={windowLabel}
        />
      </div>
    </div>
  );
}
