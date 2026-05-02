import type { Metadata } from "next";
import {
  fetchExpenses,
  fetchFinancialSummary,
} from "@/features/kintal/finance/data";
import { periodFromSearchParams } from "@/features/kintal/finance/period";
import { PageHeader } from "@/features/kintal/finance/sections/page-header";
import { SummaryGrid } from "@/features/kintal/finance/sections/summary-grid";
import { ProjectionCard } from "@/features/kintal/finance/sections/projection-card";
import { RevenueBreakdown } from "@/features/kintal/finance/sections/revenue-breakdown";
import { ExpensesBreakdown } from "@/features/kintal/finance/sections/expenses-breakdown";
import { MonthlyBars } from "@/features/kintal/finance/sections/monthly-bars";
import { ExpensesList } from "@/features/kintal/finance/sections/expenses-list";

export const metadata: Metadata = {
  title: "Financeiro",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KintalFinancePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const period = periodFromSearchParams(sp);

  const [summary, expenses] = await Promise.all([
    fetchFinancialSummary(period),
    fetchExpenses(period),
  ]);

  // Default da data do form de despesa = hoje no TZ de São Paulo (string
  // YYYY-MM-DD pra `<input type="date">` aceitar sem drift).
  const todaySp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <PageHeader period={period} />

      <div className="mt-12 flex flex-col gap-6">
        <SummaryGrid summary={summary} />

        <ProjectionCard summary={summary} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RevenueBreakdown summary={summary} />
          <ExpensesBreakdown summary={summary} />
        </div>

        <MonthlyBars summary={summary} />

        <ExpensesList expenses={expenses} defaultOccurredAt={todaySp} />
      </div>
    </div>
  );
}
