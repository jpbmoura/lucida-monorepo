import { FileText, Users, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewDTO } from "../data";

interface OverviewSummaryProps {
  summary: OverviewDTO["summary"];
}

export function OverviewSummary({ summary }: OverviewSummaryProps) {
  const cards = [
    {
      icon: <FileText className="size-3.5" />,
      label: "Provas criadas",
      value: summary.examsCreated.toString(),
      hint:
        summary.examsCreated === 0
          ? "nenhuma no período"
          : summary.examsCreated === 1
            ? "1 no período"
            : `${summary.examsCreated} no período`,
    },
    {
      icon: <Users className="size-3.5" />,
      label: "Submissões recebidas",
      value: summary.submissionsReceived.toString(),
      hint: summary.submissionsReceived === 1 ? "1 aluno" : "alunos que responderam",
    },
    {
      icon: <Target className="size-3.5" />,
      label: "Média geral",
      value:
        summary.averageScore !== null
          ? summary.averageScore.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
            })
          : "—",
      valueSuffix: summary.averageScore !== null ? "/10" : undefined,
      hint: "todas as provas",
      featured: true,
    },
    {
      icon: <Clock className="size-3.5" />,
      label: "Tempo economizado",
      value: formatTimeSaved(summary.estimatedTimeSavedSeconds),
      hint: `${summary.questionsGraded.toLocaleString("pt-BR")} questões corrigidas automaticamente`,
    },
  ];

  return (
    <section className="mb-10">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 md:grid-cols-4">
        {cards.map((c, i) => (
          <Cell key={i} {...c} />
        ))}
      </div>
    </section>
  );
}

function Cell({
  icon,
  label,
  value,
  valueSuffix,
  hint,
  featured,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueSuffix?: string;
  hint: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-5",
        featured ? "bg-ink text-white" : "bg-white",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.08em]",
            featured ? "text-white/60" : "text-gray-500",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "grid size-6 place-items-center rounded-md",
            featured ? "bg-white/10 text-white" : "bg-gray-50 text-gray-500",
          )}
        >
          {icon}
        </span>
      </div>
      <div
        className={cn(
          "flex items-baseline gap-1 text-3xl font-medium leading-none tracking-tighter tabular-nums",
          featured ? "text-white" : "text-ink",
        )}
      >
        {value}
        {valueSuffix && (
          <span
            className={cn(
              "text-sm",
              featured ? "text-white/40" : "text-gray-400",
            )}
          >
            {valueSuffix}
          </span>
        )}
      </div>
      <div
        className={cn(
          "text-[11px]",
          featured ? "text-white/50" : "text-gray-500",
        )}
      >
        {hint}
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
