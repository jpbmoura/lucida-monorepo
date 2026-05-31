import Link from "next/link";
import {
  Users,
  TrendingUp,
  Trophy,
  AlertCircle,
  Clock,
  ShieldAlert,
  Hourglass,
  CheckCircle2,
  ScanLine,
  Globe,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { AiGradingPanel } from "../grading/ai-grading-panel";
import type {
  GradingStatus,
  IntegrityFlags,
  SubmissionEndReason,
  SubmissionSource,
} from "../data";

export interface SubmissionItem {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  score: number;
  correctCount: number;
  questionCount: number;
  submittedAt: string;
  source: SubmissionSource;
  endReason: SubmissionEndReason;
  integrityFlags: IntegrityFlags;
  gradingStatus: GradingStatus;
  hasAiDraft: boolean;
}

export interface SubmissionsStats {
  total: number;
  average: number;
  highest: number | null;
  lowest: number | null;
  passRate: number | null;
  inProgress: number;
}

interface SubmissionsSectionProps {
  items: SubmissionItem[];
  stats: SubmissionsStats;
  examId: string;
}

export function SubmissionsSection({
  items,
  stats,
  examId,
}: SubmissionsSectionProps) {
  const hasGrading = items.some((i) => i.gradingStatus !== "not_required");
  const pendingGrading = items.filter(
    (i) => i.gradingStatus === "pending" || i.gradingStatus === "partially_graded",
  ).length;
  const draftSubmissionIds = items
    .filter((i) => i.hasAiDraft)
    .map((i) => i.id);
  const showAiPanel = pendingGrading > 0 || draftSubmissionIds.length > 0;
  if (items.length === 0) {
    return (
      <section className="mt-12">
        <SectionHeader total={0} inProgress={stats.inProgress} />
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Users className="size-5" />
          </span>
          <h3 className="text-lg font-medium text-ink">Ainda sem submissões</h3>
          <p className="max-w-sm text-sm text-gray-500">
            Assim que um aluno responder pela URL pública, aparece aqui com a nota.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <SectionHeader total={stats.total} inProgress={stats.inProgress} />

      {pendingGrading > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <PencilLine className="size-4 shrink-0" />
          {pendingGrading}{" "}
          {pendingGrading === 1
            ? "submissão com discursiva aguardando correção"
            : "submissões com discursivas aguardando correção"}
          .
        </div>
      )}

      {showAiPanel && (
        <AiGradingPanel examId={examId} draftSubmissionIds={draftSubmissionIds} />
      )}

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 md:grid-cols-4">
        <StatCell
          label="Média"
          value={stats.average.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          suffix="/10"
          icon={<TrendingUp className="size-3.5" />}
          featured
        />
        <StatCell
          label="Maior"
          value={
            stats.highest !== null
              ? stats.highest.toLocaleString("pt-BR", { minimumFractionDigits: 1 })
              : "—"
          }
          icon={<Trophy className="size-3.5" />}
        />
        <StatCell
          label="Menor"
          value={
            stats.lowest !== null
              ? stats.lowest.toLocaleString("pt-BR", { minimumFractionDigits: 1 })
              : "—"
          }
          icon={<AlertCircle className="size-3.5" />}
        />
        <StatCell
          label="Aprovação"
          value={stats.passRate !== null ? `${stats.passRate}%` : "—"}
          hint="nota ≥ 6"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              <th className="px-4 py-3 md:px-6">Aluno</th>
              <th className="hidden px-4 py-3 md:table-cell">Código</th>
              <th className="px-4 py-3 text-right">Nota</th>
              <th className="hidden px-4 py-3 md:table-cell">Acertos</th>
              {hasGrading && (
                <th className="px-4 py-3">Correção</th>
              )}
              <th className="hidden px-4 py-3 md:table-cell">Finalização</th>
              <th className="px-4 py-3 text-right md:px-6">Enviado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={item.id}
                className={cn(
                  "transition-colors hover:bg-gray-50",
                  i < items.length - 1 && "border-b border-gray-100",
                )}
              >
                <td className="px-4 py-3 font-medium text-ink md:px-6">
                  <div className="flex items-center gap-2">
                    <SourceIcon source={item.source} />
                    {item.studentName}
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-600">
                    {item.studentCode}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ScoreBadge score={item.score} />
                </td>
                <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                  <span className="tabular-nums">
                    {item.correctCount}/{item.questionCount}
                  </span>
                </td>
                {hasGrading && (
                  <td className="px-4 py-3">
                    <GradingBadge
                      examId={examId}
                      submissionId={item.id}
                      status={item.gradingStatus}
                      hasAiDraft={item.hasAiDraft}
                    />
                  </td>
                )}
                <td className="hidden px-4 py-3 md:table-cell">
                  <EndReasonBadge
                    endReason={item.endReason}
                    flags={item.integrityFlags}
                  />
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 md:px-6">
                  {formatRelativeTime(item.submittedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionHeader({
  total,
  inProgress,
}: {
  total: number;
  inProgress: number;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h2 className="flex items-baseline gap-3 text-2xl font-medium tracking-tight text-ink">
        Submissões
        {total > 0 && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-sm font-medium tabular-nums text-gray-600">
            {total}
          </span>
        )}
        {inProgress > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-700">
            <Hourglass className="size-3" />
            {inProgress} em andamento
          </span>
        )}
      </h2>
      <p className="text-sm text-gray-500">
        Quem respondeu pela URL pública e as notas automáticas.
      </p>
    </header>
  );
}

function SourceIcon({ source }: { source: SubmissionSource }) {
  if (source === "scanner") {
    return (
      <span
        className="grid size-5 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-600"
        title="Digitalizada pelo scanner"
      >
        <ScanLine className="size-3" />
      </span>
    );
  }
  return (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-md bg-sky-50 text-sky-600"
      title="Respondida online"
    >
      <Globe className="size-3" />
    </span>
  );
}

function EndReasonBadge({
  endReason,
  flags,
}: {
  endReason: SubmissionEndReason;
  flags: IntegrityFlags;
}) {
  if (endReason === "submitted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="size-3" />
        Enviada
      </span>
    );
  }
  if (endReason === "time_expired") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
        title="Tempo esgotado — auto-envio"
      >
        <Clock className="size-3" />
        Tempo esgotado
      </span>
    );
  }
  if (endReason === "violation") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700"
        title={formatFlagsTooltip(flags)}
      >
        <ShieldAlert className="size-3" />
        Violações ({flags.violationCount})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      Abandonada
    </span>
  );
}

function GradingBadge({
  examId,
  submissionId,
  status,
  hasAiDraft,
}: {
  examId: string;
  submissionId: string;
  status: GradingStatus;
  hasAiDraft: boolean;
}) {
  if (status === "not_required") {
    return <span className="text-xs text-gray-300">—</span>;
  }

  const href = `/app/provas/${examId}/corrigir/${submissionId}`;

  if (status === "graded") {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
      >
        <CheckCircle2 className="size-3" />
        Corrigida
      </Link>
    );
  }

  // Há rascunho da IA aguardando revisão — destaca como "Revisar IA".
  if (hasAiDraft) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-200"
      >
        <Sparkles className="size-3" />
        Revisar IA
      </Link>
    );
  }

  const label = status === "partially_graded" ? "Continuar" : "Corrigir";
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-200"
    >
      <PencilLine className="size-3" />
      {label}
    </Link>
  );
}

function formatFlagsTooltip(f: IntegrityFlags): string {
  const parts: string[] = [];
  if (f.tabSwitches) parts.push(`${f.tabSwitches} troca(s) de aba`);
  if (f.focusLosses) parts.push(`${f.focusLosses} perda(s) de foco`);
  if (f.copyAttempts) parts.push(`${f.copyAttempts} cópia(s) bloqueada(s)`);
  if (f.rightClickAttempts)
    parts.push(`${f.rightClickAttempts} clique(s) direito(s)`);
  return parts.length > 0 ? parts.join(" · ") : "Violação registrada";
}

function StatCell({
  label,
  value,
  suffix,
  hint,
  icon,
  featured,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  icon?: React.ReactNode;
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
        {icon && (
          <span
            className={cn(
              "grid size-6 place-items-center rounded-md",
              featured ? "bg-white/10 text-white" : "bg-gray-50 text-gray-500",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          "flex items-baseline gap-1 text-3xl font-medium leading-none tracking-tighter",
          featured ? "text-white" : "text-ink",
        )}
      >
        {value}
        {suffix && (
          <span
            className={cn("text-sm", featured ? "text-white/40" : "text-gray-400")}
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <div
          className={cn(
            "text-[11px]",
            featured ? "text-white/50" : "text-gray-400",
          )}
        >
          {hint}
        </div>
      )}
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
