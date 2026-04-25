import { AlertTriangle } from "lucide-react";
import type { OrgOverviewDTO } from "../data";

interface AtRiskTeachersProps {
  teachers: OrgOverviewDTO["atRiskTeachers"];
}

/**
 * Bloco de destaque: professores cuja média dos alunos ficou abaixo do
 * threshold (5.0 no MVP). Fica escondido quando vazio — a absência de
 * alerta é a mensagem positiva. Quando aparece, chama atenção com fundo
 * amarelo-claro e ícone de alerta.
 */
export function AtRiskTeachers({ teachers }: AtRiskTeachersProps) {
  if (teachers.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Professores em atenção
          </h2>
          <p className="text-xs text-gray-500">
            {teachers.length === 1
              ? "1 docente com turmas em dificuldade no período"
              : `${teachers.length} docentes com turmas em dificuldade no período`}
          </p>
        </div>
      </header>

      <ul className="flex flex-col divide-y divide-amber-200/60">
        {teachers.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-analytics-primary to-analytics-dark-01 text-[12px] font-semibold text-white">
              {initials(t.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">
                {t.name}
              </div>
              <div className="truncate text-xs text-gray-500">{t.reason}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <div className="text-base font-medium tracking-tight text-amber-700">
                {t.averageScore.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                <span className="text-xs text-amber-700/70">/10</span>
              </div>
              <div className="text-[11px] text-gray-500">
                {t.submissionsReceived.toLocaleString("pt-BR")}{" "}
                {t.submissionsReceived === 1 ? "submissão" : "submissões"}
              </div>
            </div>
          </li>
        ))}
      </ul>
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
