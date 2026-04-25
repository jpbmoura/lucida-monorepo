import Link from "next/link";
import { AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewDTO } from "@/features/app/analises/data";

interface ExamsListProps {
  exams: OverviewDTO["lowPerformanceExams"];
}

export function ExamsList({ exams }: ExamsListProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Provas que precisam de{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              atenção
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Média baixa no período — abra a análise pra entender onde a turma tropeçou.
          </p>
        </div>
        <Link
          href="/app/analises"
          className="inline-flex items-center gap-1 rounded-pill px-2.5 py-1.5 text-[13px] text-ink transition-colors hover:bg-gray-100"
        >
          Ver análises
          <ArrowRight className="size-3" strokeWidth={2.5} />
        </Link>
      </div>

      {exams.length === 0 ? (
        <EmptyState />
      ) : (
        <ul>
          {exams.map((exam, i) => (
            <li
              key={exam.examId}
              className={cn(
                "group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3.5 transition-[padding] hover:pl-1",
                i < exams.length - 1 && "border-b border-gray-100",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gray-50 text-gray-500">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0">
                <Link
                  href={`/app/analises/provas/${exam.examId}`}
                  className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-primary"
                >
                  {exam.title}
                </Link>
                <div className="mt-0.5 text-xs text-gray-500">
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
                aria-label="Abrir análise"
                className="shrink-0 text-gray-400 transition-colors hover:text-ink"
              >
                <ArrowRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <AlertTriangle className="size-5" />
      </span>
      <p className="text-sm font-medium text-ink">
        Nenhuma prova em risco no período
      </p>
      <p className="max-w-xs text-[12px] text-gray-500">
        Ótimo — todas as provas com submissões ficaram acima da linha de corte.
      </p>
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
