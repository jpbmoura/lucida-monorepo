import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Gauge,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { AnalyticsBreadcrumb } from "../components/analytics-breadcrumb";
import { PeriodFilter } from "../components/period-filter";
import { DistributionChart } from "../components/distribution-chart";
import { TrendLineChart } from "../components/trend-line-chart";
import { DifficultyBreakdown } from "../components/difficulty-breakdown";
import {
  AnalyticsPanel,
  AnalyticsSectionHeader,
} from "../components/section-header";
import { ScoreBadge } from "../components/score-badge";
import type { ClassOverviewDTO, OverviewPeriod } from "../data";

interface Props {
  overview: ClassOverviewDTO;
  period: OverviewPeriod;
}

export function ClassAnalyticsPage({ overview, period }: Props) {
  const { class: cls, summary } = overview;
  const hasData = summary.submissionsReceived > 0;
  const periodBase = `/app/analises/turmas/${cls.id}`;

  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <AnalyticsBreadcrumb
        nodes={[
          { label: "Análises", href: "/app/analises" },
          { label: cls.name },
        ]}
      />

      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="pulse-dot" />
            Turma
          </div>
          <h1 className="truncate text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
            {cls.name}
          </h1>
          {cls.description && (
            <p className="mt-2 max-w-2xl text-[15px] text-gray-500">
              {cls.description}
            </p>
          )}
        </div>
        <PeriodFilter active={period} baseHref={periodBase} />
      </header>

      <SummaryCards summary={summary} studentCount={cls.studentCount} />

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <AnalyticsPanel
              icon={<TrendingUp className="size-4" />}
              title="Evolução da turma"
              subtitle="Média em cada prova aplicada, em ordem cronológica"
            >
              {overview.trend.length === 0 ? (
                <EmptyPanel>
                  Nenhuma prova com submissões no período.
                </EmptyPanel>
              ) : (
                <TrendLineChart
                  primaryLabel="Média da turma"
                  data={overview.trend.map((t) => ({
                    label: shortTitle(t.title),
                    primary: t.averageScore,
                  }))}
                />
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              icon={<BarChart3 className="size-4" />}
              title="Distribuição de notas"
              subtitle="Como as notas se espalham (0–10)"
            >
              <DistributionChart data={overview.scoreDistribution} />
            </AnalyticsPanel>
          </section>

          <section className="mb-10">
            <AnalyticsSectionHeader
              kicker="Conteúdo"
              title="Acerto por dificuldade"
              description="Onde a turma trava — questões fáceis, médias ou difíceis."
            />
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <DifficultyBreakdown items={overview.difficultyBreakdown} />
            </div>
          </section>

          <section className="mb-10">
            <AnalyticsSectionHeader
              kicker="Provas"
              title="Desempenho por prova"
              description="Clique em uma prova pra ver a análise completa."
            />
            <ExamsTable exams={overview.exams} />
          </section>

          <section className="mb-10">
            <AnalyticsSectionHeader
              kicker="Alunos"
              title="Ranking da turma"
              description="Alunos ordenados por média das provas no período."
            />
            <StudentRankingTable rows={overview.studentRanking} />
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCards({
  summary,
  studentCount,
}: {
  summary: ClassOverviewDTO["summary"];
  studentCount: number;
}) {
  const cards: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
    valueSuffix?: string;
    hint: string;
    featured?: boolean;
  }> = [
    {
      icon: <Users className="size-3.5" />,
      label: "Alunos",
      value: studentCount.toString(),
      hint: "cadastrados na turma",
    },
    {
      icon: <FileText className="size-3.5" />,
      label: "Provas criadas",
      value: summary.examCount.toString(),
      hint: `${summary.submissionsReceived} submissões no período`,
    },
    {
      icon: <Target className="size-3.5" />,
      label: "Média da turma",
      value:
        summary.averageScore !== null
          ? summary.averageScore.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
            })
          : "—",
      valueSuffix: summary.averageScore !== null ? "/10" : undefined,
      hint: "todas as provas no período",
      featured: true,
    },
    {
      icon: <Gauge className="size-3.5" />,
      label: "Aprovação",
      value: summary.passRate !== null ? `${summary.passRate}%` : "—",
      hint: "alunos com nota ≥ 6",
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

function ExamsTable({ exams }: { exams: ClassOverviewDTO["exams"] }) {
  if (exams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
        Esta turma ainda não tem provas.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
            <th className="px-5 py-2.5">Prova</th>
            <th className="hidden px-5 py-2.5 text-right md:table-cell">Submissões</th>
            <th className="hidden px-5 py-2.5 text-right md:table-cell">Aprovação</th>
            <th className="px-5 py-2.5 text-right">Média</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam, i) => (
            <tr
              key={exam.examId}
              className={cn(
                "group transition-colors hover:bg-gray-50",
                i < exams.length - 1 && "border-b border-gray-100",
              )}
            >
              <td className="px-5 py-3">
                <Link
                  href={`/app/analises/provas/${exam.examId}`}
                  className="block"
                >
                  <div className="truncate font-medium text-ink transition-colors group-hover:text-brand-primary">
                    {exam.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    {exam.questionCount}{" "}
                    {exam.questionCount === 1 ? "questão" : "questões"}
                    <span className="mx-1.5 text-gray-300">·</span>
                    criada {formatRelativeTime(exam.createdAt)}
                  </div>
                </Link>
              </td>
              <td className="hidden px-5 py-3 text-right text-gray-500 tabular-nums md:table-cell">
                {exam.submissionsCount}
              </td>
              <td className="hidden px-5 py-3 text-right text-gray-500 tabular-nums md:table-cell">
                {exam.passRate !== null ? `${exam.passRate}%` : "—"}
              </td>
              <td className="px-5 py-3 text-right">
                {exam.averageScore !== null ? (
                  <ScoreBadge score={exam.averageScore} />
                ) : (
                  <span className="text-xs text-gray-400">sem dados</span>
                )}
              </td>
              <td className="pr-5 text-right">
                <Link
                  href={`/app/analises/provas/${exam.examId}`}
                  className="text-gray-400 transition-colors hover:text-ink"
                  aria-label="Ver análise da prova"
                >
                  <ArrowRight className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentRankingTable({
  rows,
}: {
  rows: ClassOverviewDTO["studentRanking"];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
        Nenhum aluno respondeu provas no período.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
            <th className="px-5 py-2.5 w-14 text-right">#</th>
            <th className="px-5 py-2.5">Aluno</th>
            <th className="hidden px-5 py-2.5 text-right md:table-cell">Provas feitas</th>
            <th className="px-5 py-2.5 text-right">Média</th>
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
              <td className="px-5 py-3 text-right">
                <RankBadge position={i + 1} />
              </td>
              <td className="px-5 py-3">
                <Link
                  href={`/app/analises/alunos/${row.studentId}`}
                  className="block"
                >
                  <div className="truncate font-medium text-ink transition-colors group-hover:text-brand-primary">
                    {row.studentName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500 tabular-nums">
                    Código {row.studentCode}
                  </div>
                </Link>
              </td>
              <td className="hidden px-5 py-3 text-right text-gray-500 tabular-nums md:table-cell">
                {row.examsTaken}
              </td>
              <td className="px-5 py-3 text-right">
                <ScoreBadge score={row.averageScore} />
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
    </div>
  );
}

function RankBadge({ position }: { position: number }) {
  if (position <= 3) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-ink">
        <Trophy
          className={cn(
            "size-3.5",
            position === 1 && "text-amber-500",
            position === 2 && "text-gray-400",
            position === 3 && "text-orange-400",
          )}
        />
        {position}
      </span>
    );
  }
  return <span className="tabular-nums text-gray-500">{position}</span>;
}

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
        <BarChart3 className="size-5" />
      </span>
      <h3 className="text-lg font-medium text-ink">
        Ainda sem submissões no período
      </h3>
      <p className="max-w-md text-sm text-gray-500">
        Aplique uma prova ou mude o filtro de período pra ver os dados.
      </p>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
      {children}
    </div>
  );
}

function shortTitle(title: string): string {
  return title.length > 18 ? title.slice(0, 17) + "…" : title;
}
