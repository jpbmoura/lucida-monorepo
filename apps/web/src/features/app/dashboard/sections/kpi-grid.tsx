import { FileText, Clock, Users, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewDTO } from "@/features/app/analises/data";

interface KpiGridProps {
  summary: OverviewDTO["summary"];
}

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  hint: string;
  featured?: boolean;
}

export function KpiGrid({ summary }: KpiGridProps) {
  const kpis: Kpi[] = [
    {
      label: "Provas criadas",
      value: summary.examsCreated.toString(),
      icon: FileText,
      hint:
        summary.examsCreated === 0
          ? "nenhuma no período"
          : summary.examsCreated === 1
            ? "1 no período"
            : `${summary.examsCreated} no período`,
      featured: true,
    },
    {
      label: "Submissões recebidas",
      value: summary.submissionsReceived.toLocaleString("pt-BR"),
      icon: Users,
      hint:
        summary.submissionsReceived === 0
          ? "sem respostas ainda"
          : summary.submissionsReceived === 1
            ? "1 resposta"
            : "respostas dos alunos",
    },
    {
      label: "Média geral",
      value:
        summary.averageScore !== null
          ? summary.averageScore.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : "—",
      unit: summary.averageScore !== null ? "/10" : undefined,
      icon: Target,
      hint:
        summary.averageScore !== null
          ? "considerando todas as provas"
          : "sem notas no período",
    },
    {
      label: "Tempo economizado",
      value: formatTimeSaved(summary.estimatedTimeSavedSeconds),
      icon: Clock,
      hint: `${summary.questionsGraded.toLocaleString("pt-BR")} questões corrigidas pela IA`,
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
          "flex items-baseline gap-1.5 text-[2.75rem] font-medium leading-none tracking-tighter",
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

function formatTimeSaved(seconds: number): string {
  if (seconds < 60) return "0min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = minutes / 60;
  if (hours < 10) return `${hours.toFixed(1).replace(".", ",")}h`;
  return `${Math.round(hours)}h`;
}
