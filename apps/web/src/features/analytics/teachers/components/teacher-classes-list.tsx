import { GraduationCap, FolderOpen } from "lucide-react";
import type { TeacherOverviewDTO } from "../data";

interface TeacherClassesListProps {
  classes: TeacherOverviewDTO["classes"];
}

export function TeacherClassesList({ classes }: TeacherClassesListProps) {
  // Agrupa por curso preservando a ordem original (que já vem do backend
  // sorted por exam count).
  const groups = new Map<
    string,
    { courseName: string; items: TeacherOverviewDTO["classes"] }
  >();
  for (const c of classes) {
    const entry = groups.get(c.courseId);
    if (entry) {
      entry.items.push(c);
    } else {
      groups.set(c.courseId, { courseName: c.courseName, items: [c] });
    }
  }

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
                ? `1 turma · ${groups.size} curso`
                : `${classes.length} turmas · ${groups.size} ${groups.size === 1 ? "curso" : "cursos"}`}
          </p>
        </div>
      </header>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-8 text-center text-sm text-gray-500">
          Ainda sem turmas.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from(groups.values()).map((group) => (
            <div key={group.courseName + group.items[0]?.classId} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                <FolderOpen className="size-3.5" />
                {group.courseName}
              </div>
              <ul className="flex flex-col divide-y divide-gray-100">
                {group.items.map((c) => (
                  <li
                    key={c.classId}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
