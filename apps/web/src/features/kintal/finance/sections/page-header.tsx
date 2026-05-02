import { PeriodFilter } from "../components/period-filter";
import { periodLabel } from "../period";
import type { FinancePeriod } from "../types";

interface PageHeaderProps {
  period: FinancePeriod;
}

// Cabeçalho com eyebrow + headline (espelha visão geral do Kintal). O
// filtro de período fica à direita; em telas pequenas vai pra baixo.
export function PageHeader({ period }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Backoffice · Financeiro
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.5rem]">
          Visão{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-gray-500">
            financeira
          </span>
        </h1>
        <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-gray-500">
          Faturamento bruto e líquido, gastos e projeção em{" "}
          {periodLabel(period)}.
        </p>
      </div>

      <PeriodFilter active={period} />
    </div>
  );
}
