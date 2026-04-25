import { GraduationCap } from "lucide-react";
import type { TeacherOverviewDTO } from "../data";

interface TeacherClassesListProps {
  classes: TeacherOverviewDTO["classes"];
}

export function TeacherClassesList({ classes }: TeacherClassesListProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
          <GraduationCap className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Turmas do professor
          </h2>
          <p className="text-xs text-gray-500">
            {classes.length === 0
              ? "Sem turmas cadastradas"
              : classes.length === 1
                ? "1 turma"
                : `${classes.length} turmas`}
          </p>
        </div>
      </header>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-8 text-center text-sm text-gray-500">
          Ainda sem turmas.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          {classes.map((c) => (
            <li key={c.classId} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {c.name}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {c.studentCount.toLocaleString("pt-BR")}{" "}
                  {c.studentCount === 1 ? "aluno" : "alunos"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-medium tabular-nums text-ink">
                  {c.examCount.toLocaleString("pt-BR")}
                </div>
                <div className="text-[11px] text-gray-400">
                  {c.examCount === 1 ? "prova" : "provas"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
