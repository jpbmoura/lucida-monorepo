import { GraduationCap } from "lucide-react";
import type { TeacherOverviewDTO } from "../data";

interface TeacherStudentsListProps {
  students: TeacherOverviewDTO["students"];
}

/**
 * Lista de alunos do professor (top 100 mais recentes). Agrupa visualmente
 * pela turma usando o `className` em destaque na linha de separação.
 * Quando o owner começar a editar (Fase 4b via impersonate), cada aluno
 * vira clicável; por enquanto é só leitura.
 */
export function TeacherStudentsList({ students }: TeacherStudentsListProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
          <GraduationCap className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Alunos do professor
          </h2>
          <p className="text-xs text-gray-500">
            {students.length === 0
              ? "Sem alunos cadastrados"
              : students.length === 1
                ? "1 aluno"
                : `${students.length} alunos (mais recentes primeiro)`}
          </p>
        </div>
      </header>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-8 text-center text-sm text-gray-500">
          Nenhum aluno cadastrado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-[0.08em] text-gray-500">
              <tr>
                <th className="py-2.5 pl-4 pr-2 text-left font-medium">Aluno</th>
                <th className="px-2 py-2.5 text-left font-medium">Turma</th>
                <th className="px-2 py-2.5 text-left font-medium">Código</th>
                <th className="px-2 py-2.5 text-left font-medium">Matrícula</th>
                <th className="py-2.5 pl-2 pr-4 text-right font-medium">
                  Cadastrado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.studentId} className="hover:bg-gray-50/60">
                  <td className="py-3 pl-4 pr-2">
                    <div className="flex items-center gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600">
                        {initials(s.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-ink">
                          {s.name}
                        </div>
                        {s.email && (
                          <div className="truncate text-[11px] text-gray-500">
                            {s.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="truncate px-2 py-3 text-[12px] text-gray-600">
                    {s.className}
                  </td>
                  <td className="px-2 py-3 font-mono text-[12px] text-gray-600 tabular-nums">
                    {s.code}
                  </td>
                  <td className="px-2 py-3 text-[12px] text-gray-600">
                    {s.matricula}
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right text-[11px] text-gray-500">
                    {formatDate(s.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
