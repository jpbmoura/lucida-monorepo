import {
  Banknote,
  Sparkles,
  UserPlus,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KintalDashboardMetrics } from "../types";
import { formatBrl, formatInt, formatPct } from "../format";

interface KpiGridProps {
  metrics: KintalDashboardMetrics;
  windowLabel: string;
}

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  hint: string;
  featured?: boolean;
}

// 4 KPIs macro no mesmo layout dos dashboards Exam/Analytics: grid gap-px
// em cima de bg-gray-100 (cria a linha divisória entre cards). MRR é o
// card "featured" em bg-ink — é a métrica-estrela do backoffice.
export function KpiGrid({ metrics, windowLabel }: KpiGridProps) {
  const mrr = splitCurrency(metrics.mrrCents);

  const kpis: Kpi[] = [
    {
      label: "MRR",
      value: mrr.whole,
      unit: mrr.fraction,
      icon: Banknote,
      hint: "receita recorrente mensal",
      featured: true,
    },
    {
      label: "Usuários ativos",
      value: formatInt(metrics.activeUsers),
      icon: Sparkles,
      hint: `consumiram IA · ${windowLabel}`,
    },
    {
      label: "Novos usuários",
      value: formatInt(metrics.newUsers),
      icon: UserPlus,
      hint: `cadastros · ${windowLabel}`,
    },
    {
      label: "Churn",
      value: formatPct(metrics.churnRatePct),
      icon: TrendingDown,
      hint: `cancelamentos · ${windowLabel}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const featured = Boolean(kpi.featured);

  return (
    <div
      className={cn(
        "group flex flex-col gap-[18px] p-7 transition-colors",
        featured ? "bg-ink text-white" : "bg-white hover:bg-gray-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-[0.08em]",
            featured ? "text-white/60" : "text-gray-500",
          )}
        >
          {kpi.label}
        </span>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            featured ? "bg-white/10 text-white" : "bg-gray-50 text-gray-500",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>

      <div
        className={cn(
          "flex items-baseline gap-1 text-[2.75rem] font-medium leading-none tracking-tighter tabular-nums",
          featured ? "text-white" : "text-ink",
        )}
      >
        {kpi.value}
        {kpi.unit && (
          <span
            className={cn(
              "text-lg font-normal",
              featured ? "text-white/40" : "text-gray-400",
            )}
          >
            {kpi.unit}
          </span>
        )}
      </div>

      <div
        className={cn(
          "text-[11px]",
          featured ? "text-white/50" : "text-gray-400",
        )}
      >
        {kpi.hint}
      </div>
    </div>
  );
}

// Separa "R$ 1.234" do ",56" — o valor principal fica no tamanho grande,
// os centavos em tom auxiliar (igual ao "/10" do Exam).
function splitCurrency(cents: number): { whole: string; fraction: string } {
  const formatted = formatBrl(cents);
  const match = formatted.match(/^(.*)([,.]\d{2})$/);
  if (!match) return { whole: formatted, fraction: "" };
  return { whole: match[1]!.trim(), fraction: match[2]! };
}
