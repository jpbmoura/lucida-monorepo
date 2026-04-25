import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  FileText,
  Globe,
  ScanLine,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { AnalyticsBreadcrumb } from "../components/analytics-breadcrumb";
import { TrendLineChart } from "../components/trend-line-chart";
import { DifficultyBreakdown } from "../components/difficulty-breakdown";
import {
  AnalyticsPanel,
  AnalyticsSectionHeader,
} from "../components/section-header";
import { ScoreBadge } from "../components/score-badge";
import type { StudentOverviewDTO } from "../data";

interface Props {
  overview: StudentOverviewDTO;
}

export function StudentAnalyticsPage({ overview }: Props) {
  const { student, summary } = overview;
  const hasData = summary.examsTaken > 0;

  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <AnalyticsBreadcrumb
        nodes={[
          { label: "Análises", href: "/app/analises" },
          {
            label: student.className,
            href: `/app/analises/turmas/${student.classId}`,
          },
          { label: student.name },
        ]}
      />

      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Aluno
        </div>
        <h1 className="truncate text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          {student.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium tabular-nums">
            Código {student.code}
          </span>
          <span className="size-0.5 rounded-full bg-gray-300" />
          <span>Matrícula {student.matricula}</span>
          {student.email && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span className="truncate">{student.email}</span>
            </>
          )}
        </div>
      </header>

      <SummaryCards summary={summary} />

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
            <AnalyticsPanel
              icon={<TrendingUp className="size-4" />}
              title="Aluno vs. turma"
              subtitle="Nota do aluno em cada prova × média da turma"
            >
              {overview.trend.length < 2 ? (
                <EmptyPanel>
                  Só dá pra desenhar tendência com 2 provas ou mais.
                </EmptyPanel>
              ) : (
                <TrendLineChart
                  primaryLabel={student.name}
                  secondaryLabel="Média da turma"
                  data={overview.trend.map((t) => ({
                    label: shortTitle(t.title),
                    primary: t.studentScore,
                    secondary: t.classAverageScore,
                  }))}
                />
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              icon={<BarChart3 className="size-4" />}
              title="Dificuldade"
              subtitle="Acerto por tipo — linha escura = turma"
            >
              <DifficultyBreakdown
                items={overview.difficultyBreakdown.map((d) => ({
                  ...d,
                  classAccuracy: d.classAccuracy,
                }))}
                referenceLabel="Turma"
              />
            </AnalyticsPanel>
          </section>

          <section className="mb-10">
            <AnalyticsSectionHeader
              kicker="Histórico"
              title="Provas respondidas"
              description="Cada prova com a nota do aluno e como foi o desempenho dele comparado à turma."
            />
            <ExamsTable
              exams={overview.exams}
              studentName={student.name}
              classId={student.classId}
            />
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: StudentOverviewDTO["summary"] }) {
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
      label: "Média do aluno",
      value:
        summary.averageScore !== null
          ? summary.averageScore.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
            })
          : "—",
      valueSuffix: summary.averageScore !== null ? "/10" : undefined,
      hint: "de todas as provas respondidas",
      featured: true,
    },
    {
      icon: <Trophy className="size-3.5" />,
      label: "Posição na turma",
      value:
        summary.rankPosition !== null
          ? summary.rankPosition.toString()
          : "—",
      valueSuffix:
        summary.rankPosition !== null
          ? ` de ${summary.rankTotal}`
          : undefined,
      hint: "por média entre quem respondeu",
    },
    {
      icon: <FileText className="size-3.5" />,
      label: "Provas feitas",
      value: summary.examsTaken.toString(),
      hint: `de ${summary.examsAvailable} aplicadas na turma`,
    },
    {
      icon: <CalendarCheck className="size-3.5" />,
      label: "Presença",
      value:
        summary.attendanceRate !== null
          ? `${summary.attendanceRate}%`
          : "—",
      hint: "das provas aplicadas",
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

function ExamsTable({
  exams,
  studentName,
  classId,
}: {
  exams: StudentOverviewDTO["exams"];
  studentName: string;
  classId: string;
}) {
  if (exams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
        {studentName} ainda não respondeu nenhuma prova.{" "}
        <Link
          href={`/app/analises/turmas/${classId}`}
          className="text-brand-primary hover:underline"
        >
          Ver turma
        </Link>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
            <th className="px-5 py-2.5">Prova</th>
            <th className="hidden px-5 py-2.5 text-right md:table-cell">Acertos</th>
            <th className="hidden px-5 py-2.5 text-right md:table-cell">
              Média da turma
            </th>
            <th className="px-5 py-2.5 text-right">Nota do aluno</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam, i) => {
            const delta = exam.studentScore - exam.classAverageScore;
            return (
              <tr
                key={exam.examId + exam.submittedAt}
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
                    <div className="flex items-center gap-2">
                      <SourceIcon source={exam.source} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink transition-colors group-hover:text-brand-primary">
                          {exam.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {formatRelativeTime(exam.submittedAt)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-5 py-3 text-right text-gray-500 tabular-nums md:table-cell">
                  {exam.correctCount}/{exam.questionCount}
                </td>
                <td className="hidden px-5 py-3 text-right md:table-cell">
                  <span className="tabular-nums text-gray-500">
                    {exam.classAverageScore.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                    })}
                  </span>
                  <DeltaBadge delta={delta} />
                </td>
                <td className="px-5 py-3 text-right">
                  <ScoreBadge score={exam.studentScore} />
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.1) {
    return null;
  }
  const sign = delta > 0 ? "+" : "";
  const tone = delta > 0 ? "text-emerald-600" : "text-red-600";
  return (
    <span className={cn("ml-1.5 text-[10px] font-medium tabular-nums", tone)}>
      {sign}
      {delta.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
    </span>
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
        Este aluno ainda não tem submissões
      </h3>
      <p className="max-w-md text-sm text-gray-500">
        Assim que ele responder uma prova — online ou via scanner — os dados
        aparecem aqui.
      </p>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-center text-sm text-gray-400">
      {children}
    </div>
  );
}

function shortTitle(title: string): string {
  return title.length > 18 ? title.slice(0, 17) + "…" : title;
}
