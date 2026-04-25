import { Coins, FileText, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeacherOverviewDTO } from "../data";

interface TeacherKpiGridProps {
  summary: TeacherOverviewDTO["summary"];
}

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  featured?: boolean;
}

export function TeacherKpiGrid({ summary }: TeacherKpiGridProps) {
  const kpis: Kpi[] = [
    {
      label: "Provas criadas",
      value: summary.examsCreated.toLocaleString("pt-BR"),
      icon: FileText,
      hint:
        summary.examsCreated === 0
          ? "nenhuma no período"
          : summary.examsCreated === 1
            ? "1 no período"
            : "no período",
      featured: true,
    },
    {
      label: "Submissões recebidas",
      value: summary.submissionsReceived.toLocaleString("pt-BR"),
      icon: Users,
      hint:
        summary.submissionsReceived === 0
          ? "sem respostas ainda"
          : "respostas dos alunos",
    },
    {
      label: "Média dos alunos",
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
          ? "média das provas corrigidas"
          : "sem notas no período",
    },
    {
      label: "Créditos consumidos",
      value: summary.creditsConsumed.toLocaleString("pt-BR"),
      icon: Coins,
      hint:
        summary.creditsConsumed === 0
          ? "nenhum consumo no período"
          : "debitados do pool institucional",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}

function Card({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const featured = Boolean(kpi.featured);
  return (
    <div
      className={cn(
        "flex flex-col gap-[18px] p-7 transition-colors",
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
          "flex items-baseline gap-1.5 text-[2.5rem] font-medium leading-none tracking-tighter",
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
