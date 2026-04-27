import {
  BookOpen,
  Users,
  ClipboardList,
  Inbox,
  Sparkles,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInt } from "@/features/kintal/dashboard/format";
import type { KintalEngagementSummary } from "../types";

interface EngagementGridProps {
  data: KintalEngagementSummary;
}

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  icon: LucideIcon;
  featured?: boolean;
}

// Mesmo padrão do KpiGrid do dashboard: gap-px sobre bg-gray-100,
// rounded-2xl. Featured = "Última atividade" — métrica resumo que ancora
// o card a leitura "esse user está ativo?".
export function EngagementGrid({ data }: EngagementGridProps) {
  const kpis: Kpi[] = [
    {
      label: "Provas criadas",
      value: formatInt(data.examsCount),
      hint: `em ${formatInt(data.classesCount)} turma${data.classesCount === 1 ? "" : "s"}`,
      icon: ClipboardList,
    },
    {
      label: "Alunos cadastrados",
      value: formatInt(data.studentsCount),
      hint: "registros próprios",
      icon: Users,
    },
    {
      label: "Submissões",
      value: formatInt(data.submissionsCount),
      hint:
        data.averageStudentScore !== null
          ? `nota média ${formatScore(data.averageStudentScore)}`
          : "sem submissões ainda",
      icon: Inbox,
    },
    {
      label: "Créditos consumidos",
      value: formatInt(data.totalCreditsConsumed),
      hint: "ao longo da vida da conta",
      icon: Sparkles,
    },
    {
      label: "Última atividade",
      value: formatRelativeOrDash(data.lastActivityAt),
      hint:
        data.lastActivityAt === null
          ? "nunca usou"
          : new Date(data.lastActivityAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            }),
      icon: Clock,
      featured: true,
    },
    {
      label: "Turmas",
      value: formatInt(data.classesCount),
      hint: "do professor",
      icon: BookOpen,
    },
  ];

  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-medium text-ink">
          Atividade na{" "}
          <span className="font-serif text-[1.1em] italic text-gray-500">
            plataforma
          </span>
        </h2>
        <span className="text-[11px] text-gray-400">desde o cadastro</span>
      </header>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCell key={kpi.label} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}

function KpiCell({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const featured = Boolean(kpi.featured);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-5 transition-colors",
        featured ? "bg-ink text-white" : "bg-white hover:bg-gray-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.08em]",
            featured ? "text-white/60" : "text-gray-500",
          )}
        >
          {kpi.label}
        </span>
        <span
          className={cn(
            "grid size-6 place-items-center rounded-md",
            featured ? "bg-white/10 text-white" : "bg-gray-50 text-gray-500",
          )}
        >
          <Icon className="size-3" />
        </span>
      </div>
      <div
        className={cn(
          "text-2xl font-medium leading-none tracking-tighter tabular-nums",
          featured ? "text-white" : "text-ink",
        )}
      >
        {kpi.value}
      </div>
      <div
        className={cn(
          "text-[10px]",
          featured ? "text-white/50" : "text-gray-400",
        )}
      >
        {kpi.hint}
      </div>
    </div>
  );
}

function formatScore(s: number): string {
  return s.toFixed(s >= 10 ? 0 : 1).replace(".", ",");
}

function formatRelativeOrDash(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoje";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}a`;
}
