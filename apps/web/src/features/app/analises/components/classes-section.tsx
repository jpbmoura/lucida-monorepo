import {
  AlertCircle,
  ArrowRight,
  Trophy,
  Users,
} from "lucide-react";
import { ClickableCard } from "@/components/ui/clickable-card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { deriveTurmaInitials } from "@/features/app/turmas/utils";
import type { OverviewDTO } from "../data";

interface ClassesSectionProps {
  classesRanking: OverviewDTO["classesRanking"];
  atRiskStudents: OverviewDTO["atRiskStudents"];
}

export function ClassesSection({
  classesRanking,
  atRiskStudents,
}: ClassesSectionProps) {
  if (classesRanking.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <SectionHeader
        kicker="Turmas"
        title="Quem está indo bem, quem precisa de olho"
        description="Ranking das turmas no período e alunos que tropeçaram na última prova."
      />

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ClassRankingPanel classes={classesRanking} />
        <AtRiskPanel students={atRiskStudents} />
      </div>
    </section>
  );
}

function ClassRankingPanel({
  classes,
}: {
  classes: OverviewDTO["classesRanking"];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <span className="grid size-7 place-items-center rounded-md bg-brand-primary/10 text-brand-primary">
          <Trophy className="size-4" />
        </span>
        <div>
          <div className="text-sm font-medium text-ink">Ranking de turmas</div>
          <div className="text-[11px] text-gray-500">
            Por média no período — turmas sem dados ficam no fim.
          </div>
        </div>
      </header>
      <div className="hidden grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-gray-100 bg-gray-50/60 px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500 md:grid">
        <span>Turma</span>
        <span className="min-w-16 text-right">Alunos</span>
        <span className="min-w-20 text-right">Submissões</span>
        <span className="min-w-14 text-right">Média</span>
      </div>
      <ul>
        {classes.map((cls, i) => (
          <ClickableCard
            key={cls.classId}
            as="li"
            href={`/app/analises/turmas/${cls.classId}`}
            ariaLabel={`Abrir análise de ${cls.className}`}
            className={cn(
              "grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50 md:grid-cols-[1fr_auto_auto_auto]",
              i < classes.length - 1 && "border-b border-gray-100",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-primary text-[12px] font-semibold text-white">
                {deriveTurmaInitials(cls.className)}
              </span>
              <span className="truncate text-sm font-medium text-ink transition-colors group-hover:text-brand-primary">
                {cls.className}
              </span>
            </div>
            <span className="hidden min-w-16 text-right text-sm text-gray-500 tabular-nums md:block">
              {cls.studentCount}
            </span>
            <span className="hidden min-w-20 text-right text-sm text-gray-500 tabular-nums md:block">
              {cls.submissionsInPeriod}
            </span>
            <div className="min-w-14 text-right text-sm">
              {cls.averageScore !== null ? (
                <ScoreBadge score={cls.averageScore} />
              ) : (
                <span className="text-xs text-gray-400">sem dados</span>
              )}
            </div>
          </ClickableCard>
        ))}
      </ul>
    </div>
  );
}

function AtRiskPanel({
  students,
}: {
  students: OverviewDTO["atRiskStudents"];
}) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Users className="size-5" />
        </span>
        <div>
          <div className="text-sm font-medium text-ink">
            Nenhum aluno em risco no período
          </div>
          <p className="mt-0.5 text-[12px] text-gray-500">
            Todas as últimas submissões ficaram acima de 6.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <span className="grid size-7 place-items-center rounded-md bg-red-50 text-red-600">
          <AlertCircle className="size-4" />
        </span>
        <div>
          <div className="text-sm font-medium text-ink">Alunos em risco</div>
          <div className="text-[11px] text-gray-500">
            Última submissão abaixo de 6 — até 10 alunos.
          </div>
        </div>
      </header>
      <ul>
        {students.map((s, i) => (
          <ClickableCard
            key={s.studentId}
            as="li"
            href={`/app/analises/alunos/${s.studentId}`}
            ariaLabel={`Abrir análise de ${s.studentName}`}
            className={cn(
              "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50",
              i < students.length - 1 && "border-b border-gray-100",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink transition-colors group-hover:text-brand-primary">
                {s.studentName}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-gray-500">
                {s.className}
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="italic">{s.lastExamTitle}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <span>{formatRelativeTime(s.lastSubmittedAt)}</span>
              </div>
            </div>
            <ScoreBadge score={s.lastScore} />
            <span
              aria-hidden
              className="shrink-0 text-gray-400 transition-colors group-hover:text-ink"
            >
              <ArrowRight className="size-4" />
            </span>
          </ClickableCard>
        ))}
      </ul>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 8
      ? "bg-emerald-50 text-emerald-700"
      : score >= 6
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
