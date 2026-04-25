import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  FileText,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityChart } from "./activity-chart";
import { DistributionChart } from "./distribution-chart";
import type { OverviewDTO } from "../data";

interface ExamsSectionProps {
  activity: OverviewDTO["activity"];
  scoreDistribution: OverviewDTO["scoreDistribution"];
  lowPerformanceExams: OverviewDTO["lowPerformanceExams"];
  hasData: boolean;
}

export function ExamsSection({
  activity,
  scoreDistribution,
  lowPerformanceExams,
  hasData,
}: ExamsSectionProps) {
  return (
    <section className="mb-12">
      <SectionHeader
        kicker="Avaliações"
        title="Provas e submissões"
        description="Quando os alunos respondem, como eles performam e onde estão as dores."
      />

      {!hasData ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
            <BarChart3 className="size-5" />
          </span>
          <h3 className="text-lg font-medium text-ink">
            Ainda sem submissões no período
          </h3>
          <p className="max-w-md text-sm text-gray-500">
            Aplique uma prova (online ou digitalizando a folha) e os gráficos
            vão começar a aparecer aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel
              icon={<TrendingUp className="size-4" />}
              title="Atividade no período"
              subtitle="Submissões por dia"
            >
              <ActivityChart data={activity} />
            </Panel>

            <Panel
              icon={<BarChart3 className="size-4" />}
              title="Distribuição de notas"
              subtitle="Como as notas se espalham (0–10)"
            >
              <DistributionChart data={scoreDistribution} />
            </Panel>
          </div>

          {lowPerformanceExams.length > 0 && (
            <div className="mt-5">
              <LowPerformancePanel exams={lowPerformanceExams} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <header className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-gray-50 text-gray-500">
          {icon}
        </span>
        <div>
          <div className="text-sm font-medium text-ink">{title}</div>
          <div className="text-[11px] text-gray-500">{subtitle}</div>
        </div>
      </header>
      {children}
    </div>
  );
}

function LowPerformancePanel({
  exams,
}: {
  exams: OverviewDTO["lowPerformanceExams"];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <span className="grid size-7 place-items-center rounded-md bg-amber-50 text-amber-600">
          <AlertTriangle className="size-4" />
        </span>
        <div>
          <div className="text-sm font-medium text-ink">
            Provas que precisam de atenção
          </div>
          <div className="text-[11px] text-gray-500">
            Média baixa com pelo menos 3 submissões — ordenado pela pior nota.
          </div>
        </div>
      </header>
      <ul>
        {exams.map((exam, i) => (
          <li
            key={exam.examId}
            className={cn(
              "flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50",
              i < exams.length - 1 && "border-b border-gray-100",
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-500">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/app/analises/provas/${exam.examId}`}
                className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-primary"
              >
                {exam.title}
              </Link>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {exam.className}
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="tabular-nums">
                  {exam.submissionsCount}{" "}
                  {exam.submissionsCount === 1 ? "submissão" : "submissões"}
                </span>
              </div>
            </div>
            <ScoreBadge score={exam.averageScore} />
            <Link
              href={`/app/analises/provas/${exam.examId}`}
              aria-label="Abrir análise da prova"
              className="shrink-0 text-gray-400 transition-colors hover:text-ink"
            >
              <ArrowRight className="size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 6
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-700";
  return (
    <span
      className={cn(
        "inline-flex min-w-14 items-center justify-center rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
        tone,
      )}
    >
      {score.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
    </span>
  );
}

function SectionHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
        {kicker}
      </div>
      <h2 className="text-2xl font-medium tracking-tight text-ink">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </header>
  );
}
