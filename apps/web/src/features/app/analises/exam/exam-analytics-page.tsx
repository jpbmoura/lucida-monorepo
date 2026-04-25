import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock,
  Globe,
  ScanLine,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { AnalyticsBreadcrumb } from "../components/analytics-breadcrumb";
import { DistributionChart } from "../components/distribution-chart";
import { DifficultyBreakdown } from "../components/difficulty-breakdown";
import { PerQuestionChart } from "../components/per-question-chart";
import {
  AnalyticsPanel,
  AnalyticsSectionHeader,
} from "../components/section-header";
import { ScoreBadge } from "../components/score-badge";
import type { ExamOverviewDTO } from "../data";

interface Props {
  overview: ExamOverviewDTO;
}

export function ExamAnalyticsPage({ overview }: Props) {
  const { exam, summary } = overview;
  const hasData = summary.submissionsCount > 0;

  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <AnalyticsBreadcrumb
        nodes={[
          { label: "Análises", href: "/app/analises" },
          {
            label: exam.className,
            href: `/app/analises/turmas/${exam.classId}`,
          },
          { label: exam.title },
        ]}
      />

      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="pulse-dot" />
            Prova
          </div>
          <h1 className="truncate text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
            {exam.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium">
              {exam.questionCount}{" "}
              {exam.questionCount === 1 ? "questão" : "questões"}
            </span>
            {exam.duration > 0 && (
              <>
                <span className="size-0.5 rounded-full bg-gray-300" />
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {exam.duration} min
                </span>
              </>
            )}
            {exam.securityLevel === "strict" && (
              <>
                <span className="size-0.5 rounded-full bg-gray-300" />
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <ShieldAlert className="size-3" /> Modo estrito
                </span>
              </>
            )}
          </div>
        </div>
        <Link
          href={`/app/provas/${exam.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 self-start text-xs font-medium text-gray-500 transition-colors hover:text-ink md:self-end"
        >
          Abrir prova
          <ArrowRight className="size-3" />
        </Link>
      </header>

      <SummaryCards summary={summary} />

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <AnalyticsPanel
              icon={<BarChart3 className="size-4" />}
              title="Distribuição de notas"
              subtitle="Como as notas se espalham entre os alunos"
            >
              <DistributionChart data={overview.scoreDistribution} />
            </AnalyticsPanel>

            <AnalyticsPanel
              icon={<Target className="size-4" />}
              title="Por dificuldade"
              subtitle="Taxa de acerto em fácil/médio/difícil"
            >
              <DifficultyBreakdown items={overview.difficultyBreakdown} />
            </AnalyticsPanel>
          </section>

          <section className="mb-10">
            <AnalyticsSectionHeader
              kicker="Questões"
              title="Acerto questão por questão"
              description="Identifique rápido quais questões derrubaram a turma."
            />
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <PerQuestionChart data={overview.perQuestion} />
              <p className="mt-3 text-[11px] text-gray-500">
                Passe o mouse sobre a barra pra ver o enunciado e a dificuldade.
              </p>
            </div>
          </section>

          <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
            <StudentRankingTable rows={overview.studentRanking} />
            <div className="flex flex-col gap-5">
              <SourcePanel
                online={overview.sourceBreakdown.online}
                scanner={overview.sourceBreakdown.scanner}
              />
              <IntegrityPanel integrity={overview.integrityBreakdown} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: ExamOverviewDTO["summary"] }) {
  const cards: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
    valueSuffix?: string;
    hint: string;
    featured?: boolean;
  }> = [
    {
      icon: <Target className="size-3.5" />,
      label: "Média",
      value:
        summary.averageScore !== null
          ? summary.averageScore.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
            })
          : "—",
      valueSuffix: summary.averageScore !== null ? "/10" : undefined,
      hint: `${summary.submissionsCount} ${summary.submissionsCount === 1 ? "submissão" : "submissões"}`,
      featured: true,
    },
    {
      icon: <TrendingUp className="size-3.5" />,
      label: "Nota máxima",
      value:
        summary.maxScore !== null
          ? summary.maxScore.toLocaleString("pt-BR", { minimumFractionDigits: 1 })
          : "—",
      hint: "melhor resultado",
    },
    {
      icon: <TrendingDown className="size-3.5" />,
      label: "Nota mínima",
      value:
        summary.minScore !== null
          ? summary.minScore.toLocaleString("pt-BR", { minimumFractionDigits: 1 })
          : "—",
      hint: "pior resultado",
    },
    {
      icon: <Users className="size-3.5" />,
      label: "Aprovação",
      value:
        summary.passRate !== null ? `${summary.passRate}%` : "—",
      hint:
        summary.averageDurationSeconds !== null
          ? `~${formatDuration(summary.averageDurationSeconds)} de média`
          : "nota ≥ 6",
    },
  ];

  return (
    <section className="mb-10">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 md:grid-cols-4">
        {cards.map((c, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-3 p-5",
              c.featured ? "bg-ink text-white" : "bg-white",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.08em]",
                  c.featured ? "text-white/60" : "text-gray-500",
                )}
              >
                {c.label}
              </span>
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-md",
                  c.featured
                    ? "bg-white/10 text-white"
                    : "bg-gray-50 text-gray-500",
                )}
              >
                {c.icon}
              </span>
            </div>
            <div
              className={cn(
                "flex items-baseline gap-1 text-3xl font-medium leading-none tabular-nums tracking-tighter",
                c.featured ? "text-white" : "text-ink",
              )}
            >
              {c.value}
              {c.valueSuffix && (
                <span
                  className={cn(
                    "text-sm",
                    c.featured ? "text-white/40" : "text-gray-400",
                  )}
                >
                  {c.valueSuffix}
                </span>
              )}
            </div>
            <div
              className={cn(
                "text-[11px]",
                c.featured ? "text-white/50" : "text-gray-500",
              )}
            >
              {c.hint}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudentRankingTable({
  rows,
}: {
  rows: ExamOverviewDTO["studentRanking"];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <span className="grid size-7 place-items-center rounded-md bg-brand-primary/10 text-brand-primary">
          <Users className="size-4" />
        </span>
        <div>
          <div className="text-sm font-medium text-ink">Ranking nesta prova</div>
          <div className="text-[11px] text-gray-500">
            Ordenado pela nota (desc).
          </div>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          Nenhuma submissão ainda.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
              <th className="px-5 py-2.5 w-10 text-right">#</th>
              <th className="px-5 py-2.5">Aluno</th>
              <th className="hidden px-5 py-2.5 text-right md:table-cell">Enviado</th>
              <th className="px-5 py-2.5 text-right">Nota</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.studentId}
                className={cn(
                  "group transition-colors hover:bg-gray-50",
                  i < rows.length - 1 && "border-b border-gray-100",
                )}
              >
                <td className="px-5 py-3 text-right text-xs text-gray-500 tabular-nums">
                  {i + 1}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/app/analises/alunos/${row.studentId}`}
                    className="flex items-center gap-2"
                  >
                    <SourceIcon source={row.source} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink transition-colors group-hover:text-brand-primary">
                        {row.studentName}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500 tabular-nums">
                        {row.correctCount} acertos · código {row.studentCode}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-5 py-3 text-right text-xs text-gray-500 md:table-cell">
                  {formatRelativeTime(row.submittedAt)}
                </td>
                <td className="px-5 py-3 text-right">
                  <ScoreBadge score={row.score} />
                </td>
                <td className="pr-5 text-right">
                  <Link
                    href={`/app/analises/alunos/${row.studentId}`}
                    className="text-gray-400 transition-colors hover:text-ink"
                    aria-label="Ver análise do aluno"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SourcePanel({
  online,
  scanner,
}: {
  online: number;
  scanner: number;
}) {
  const total = online + scanner;
  const onlinePct = total === 0 ? 0 : Math.round((online / total) * 100);
  const scannerPct = total === 0 ? 0 : 100 - onlinePct;
  return (
    <AnalyticsPanel
      icon={<Users className="size-4" />}
      title="Origem das respostas"
      subtitle="Online vs. scanner"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-md bg-sky-50 text-sky-600">
            <Globe className="size-4" />
          </span>
          <div className="flex-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-ink">Online</span>
              <span className="font-medium tabular-nums text-ink">
                {online}{" "}
                <span className="text-[10px] font-normal text-gray-400">
                  · {onlinePct}%
                </span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${onlinePct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-md bg-indigo-50 text-indigo-600">
            <ScanLine className="size-4" />
          </span>
          <div className="flex-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-ink">Scanner</span>
              <span className="font-medium tabular-nums text-ink">
                {scanner}{" "}
                <span className="text-[10px] font-normal text-gray-400">
                  · {scannerPct}%
                </span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${scannerPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </AnalyticsPanel>
  );
}

function IntegrityPanel({
  integrity,
}: {
  integrity: ExamOverviewDTO["integrityBreakdown"];
}) {
  const total = integrity.clean + integrity.withViolations;
  return (
    <AnalyticsPanel
      icon={<ShieldAlert className="size-4" />}
      title="Integridade"
      subtitle="Detectado pelo modo estrito"
    >
      <div className="flex flex-col gap-2.5 text-xs">
        <Row label="Submissões limpas" value={integrity.clean} total={total} tone="emerald" />
        <Row
          label="Com violações registradas"
          value={integrity.withViolations}
          total={total}
          tone="amber"
        />
        <Row
          label="Finalizadas por violação"
          value={integrity.terminatedByViolation}
          total={total}
          tone="red"
        />
      </div>
    </AnalyticsPanel>
  );
}

function Row({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "amber" | "red";
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const dotClass =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-400"
        : "bg-red-400";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-gray-600">
        <span className={cn("size-1.5 rounded-full", dotClass)} />
        {label}
      </span>
      <span className="font-medium tabular-nums text-ink">
        {value}
        <span className="ml-1 text-[10px] font-normal text-gray-400">
          · {pct}%
        </span>
      </span>
    </div>
  );
}

function SourceIcon({ source }: { source: "online" | "scanner" }) {
  if (source === "scanner") {
    return (
      <span
        className="grid size-5 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-600"
        title="Scanner"
      >
        <ScanLine className="size-3" />
      </span>
    );
  }
  return (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-md bg-sky-50 text-sky-600"
      title="Online"
    >
      <Globe className="size-3" />
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
        <BarChart3 className="size-5" />
      </span>
      <h3 className="text-lg font-medium text-ink">
        Esta prova ainda não tem submissões
      </h3>
      <p className="max-w-md text-sm text-gray-500">
        Aplique a prova online ou digitalize folhas no scanner pra ver os dados.
      </p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = (minutes / 60).toFixed(1).replace(".", ",");
  return `${hours}h`;
}
