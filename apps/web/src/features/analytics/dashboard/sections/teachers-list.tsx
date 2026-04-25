import { Users } from "lucide-react";
import type { OrgOverviewDTO } from "../data";
import { TeacherRow } from "./teacher-row";

interface TeachersListProps {
  teachers: OrgOverviewDTO["teachers"];
}

/**
 * Tabela-lista dos professores da instituição. Ordem vem do backend:
 * at-risk primeiro, depois por volume de provas criadas. Cada linha é
 * clicável (via `TeacherRow` client) e leva pro drill-down do professor.
 */
export function TeachersList({ teachers }: TeachersListProps) {
  if (teachers.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
          <Users className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Professores da instituição
          </h2>
          <p className="text-xs text-gray-500">
            {teachers.length === 1
              ? "1 docente"
              : `${teachers.length} docentes`}
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-[0.08em] text-gray-500">
            <tr>
              <th className="py-2.5 pl-4 pr-2 text-left font-medium">Docente</th>
              <th className="px-2 py-2.5 text-right font-medium">Provas</th>
              <th className="px-2 py-2.5 text-right font-medium">Submissões</th>
              <th className="px-2 py-2.5 text-right font-medium">Média</th>
              <th className="py-2.5 pl-2 pr-4 text-right font-medium">
                Última atividade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teachers.map((t) => (
              <TeacherRow key={t.id} teacher={t} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
