import { FileText } from "lucide-react";
import type { TeacherOverviewDTO } from "../data";

interface TeacherExamsListProps {
  exams: TeacherOverviewDTO["recentExams"];
}

export function TeacherExamsList({ exams }: TeacherExamsListProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
          <FileText className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Provas recentes
          </h2>
          <p className="text-xs text-gray-500">
            {exams.length === 0
              ? "Sem provas no período"
              : exams.length === 1
                ? "1 prova"
                : `${exams.length} provas`}
          </p>
        </div>
      </header>

      {exams.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma prova criada nesse período.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          {exams.map((ex) => (
            <li
              key={ex.examId}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {ex.title}
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-500">
                  {ex.className} · {ex.questionCount}{" "}
                  {ex.questionCount === 1 ? "questão" : "questões"}
                </div>
              </div>
              <div className="shrink-0 text-[11px] text-gray-400">
                {formatRelative(ex.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const diffDays = Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(then);
}
