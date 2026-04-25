"use client";

import type { WebhookEvent } from "../data";

const EVENT_LABELS: Record<WebhookEvent, { title: string; hint: string }> = {
  "submission.created": {
    title: "Submissão criada",
    hint: "Aluno entregou a prova.",
  },
  "submission.scored": {
    title: "Submissão corrigida",
    hint: "Nota final foi computada.",
  },
  "exam.published": {
    title: "Prova publicada",
    hint: "Prova ficou disponível pros alunos.",
  },
  "exam.updated": {
    title: "Prova atualizada",
    hint: "Qualquer alteração em prova existente.",
  },
  "class.created": {
    title: "Turma criada",
    hint: "Nova turma foi aberta.",
  },
  "student.enrolled": {
    title: "Aluno matriculado",
    hint: "Aluno foi adicionado a uma turma.",
  },
};

interface EventChecklistProps {
  allEvents: WebhookEvent[];
  selected: Set<WebhookEvent>;
  onToggle: (ev: WebhookEvent) => void;
  disabled?: boolean;
}

export function EventChecklist({
  allEvents,
  selected,
  onToggle,
  disabled,
}: EventChecklistProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-2">
      {allEvents.map((ev) => {
        const meta = EVENT_LABELS[ev];
        const isOn = selected.has(ev);
        return (
          <label
            key={ev}
            className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-analytics-primary"
              checked={isOn}
              disabled={disabled}
              onChange={() => onToggle(ev)}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink">{meta.title}</div>
              <div className="text-xs text-gray-500">{meta.hint}</div>
            </div>
            <code className="mt-0.5 shrink-0 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
              {ev}
            </code>
          </label>
        );
      })}
    </div>
  );
}
