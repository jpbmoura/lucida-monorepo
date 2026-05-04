import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { buildDisplayUser } from "@/lib/user-display";
import {
  fetchOverview,
  type OverviewPeriod,
} from "@/features/app/analises/data";
import { PageHeader } from "@/features/app/dashboard/sections/page-header";
import { KpiGrid } from "@/features/app/dashboard/sections/kpi-grid";
import { PerformanceChart } from "@/features/app/dashboard/sections/performance-chart";
import { ActivityList } from "@/features/app/dashboard/sections/activity-list";
import { ExamsList } from "@/features/app/dashboard/sections/exams-list";
import { LuluSuggestion } from "@/features/app/dashboard/sections/lulu-suggestion";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const effective = await getEffectiveUser();
  if (!effective) redirect("/sign-in?next=/app");

  const sp = await searchParams;
  const period = parsePeriod(sp.period);

  const display = buildDisplayUser({
    name: effective.name,
    email: effective.email,
  });

  const overview = await fetchOverview(period);
  const hasActivity = overview.summary.submissionsReceived > 0;

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <PageHeader firstName={display.firstName} period={period} />

      <div className="mt-12">
        <KpiGrid summary={overview.summary} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <PerformanceChart activity={overview.activity} hasActivity={hasActivity} />
        <ActivityList />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ExamsList exams={overview.lowPerformanceExams} />
        <LuluSuggestion atRiskStudents={overview.atRiskStudents} />
      </div>
    </div>
  );
}

function parsePeriod(raw: string | undefined): OverviewPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "all") {
    return raw;
  }
  return "30d";
}
