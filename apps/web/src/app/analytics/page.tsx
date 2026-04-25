import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { buildDisplayUser } from "@/lib/user-display";
import {
  fetchOrgOverview,
  type OrgOverviewPeriod,
} from "@/features/analytics/dashboard/data";
import { PageHeader } from "@/features/analytics/dashboard/sections/page-header";
import { KpiGrid } from "@/features/analytics/dashboard/sections/kpi-grid";
import { AtRiskTeachers } from "@/features/analytics/dashboard/sections/at-risk-teachers";
import { TeachersList } from "@/features/analytics/dashboard/sections/teachers-list";
import { EmptyState } from "@/features/analytics/dashboard/sections/empty-state";
import { NoActiveOrg } from "@/features/analytics/dashboard/sections/no-active-org";
import { ComingSoonSection } from "@/features/analytics/dashboard/sections/coming-soon";
import { fetchOrgBilling } from "@/features/analytics/billing/data";
import { OrgBalanceCard } from "@/features/analytics/billing/components/org-balance-card";
import { OrgLedgerSection } from "@/features/analytics/billing/components/org-ledger-section";

export const metadata: Metadata = {
  title: "Dashboard · Instituição",
};

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function AnalyticsDashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getServerSession();
  if (!session) redirect("/organizacoes/entrar?next=/analytics");

  const sp = await searchParams;
  const period = parsePeriod(sp.period);

  const [overview, billing, display] = await Promise.all([
    fetchOrgOverview(period),
    fetchOrgBilling(),
    Promise.resolve(
      buildDisplayUser({
        name: session.user.name,
        email: session.user.email,
      }),
    ),
  ]);

  // Sessão sem organização ativa — fluxo de recuperação em vez de explodir.
  if (!overview) {
    return (
      <main className="flex-1 px-5 py-12 md:px-10">
        <NoActiveOrg />
      </main>
    );
  }

  const { summary, organization, teachers, atRiskTeachers } = overview;
  const hasTeachers = summary.totalTeachers > 1;
  const hasActivity =
    summary.examsCreated > 0 || summary.submissionsReceived > 0;

  return (
    <main className="flex-1 px-5 py-10 pb-20 md:px-10">
      <div className="mx-auto flex w-full flex-col gap-10">
        <PageHeader
          firstName={display.firstName}
          orgName={organization.name}
          period={period}
        />

        {billing && <OrgBalanceCard billing={billing} />}

        <KpiGrid summary={summary} />

        {!hasTeachers && (
          <EmptyState variant="no-teachers" orgName={organization.name} />
        )}

        {hasTeachers && !hasActivity && (
          <EmptyState variant="no-activity" orgName={organization.name} />
        )}

        <AtRiskTeachers teachers={atRiskTeachers} />

        {hasTeachers && <TeachersList teachers={teachers} />}

        {billing && <OrgLedgerSection ledger={billing.ledger} />}

        <ComingSoonSection />
      </div>
    </main>
  );
}

function parsePeriod(raw: string | undefined): OrgOverviewPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "all") {
    return raw;
  }
  return "30d";
}
