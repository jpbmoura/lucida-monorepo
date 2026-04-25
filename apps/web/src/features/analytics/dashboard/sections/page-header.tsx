import { PeriodFilter } from "@/features/app/analises/components/period-filter";
import type { OrgOverviewPeriod } from "../data";

interface PageHeaderProps {
  firstName: string;
  orgName: string;
  period: OrgOverviewPeriod;
}

export function PageHeader({ firstName, orgName, period }: PageHeaderProps) {
  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(now);

  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          {capitalize(formattedDate)}
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.5rem]">
          {greeting}, {firstName} —{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-analytics-primary">
            a visão da escola
          </span>
        </h1>
        <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-gray-500">
          Panorama de{" "}
          <span className="font-medium text-ink">{orgName}</span> no período
          selecionado.
        </p>
      </div>

      <PeriodFilter active={period} baseHref="/analytics" />
    </div>
  );
}

function getGreeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
