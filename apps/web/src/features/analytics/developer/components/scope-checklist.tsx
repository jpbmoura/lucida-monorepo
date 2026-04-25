"use client";

import type { ApiKeyScope } from "../data";

// Descrição amigável de cada escopo — mostrada ao lado do checkbox no
// form de criação. Mantemos aqui (não no backend) porque é copy de UI.
const SCOPE_LABELS: Record<ApiKeyScope, { title: string; hint: string }> = {
  "classes:read": {
    title: "Listar turmas",
    hint: "Ler turmas e seus metadados.",
  },
  "classes:write": {
    title: "Gerenciar turmas",
    hint: "Criar, editar e remover turmas.",
  },
  "students:read": {
    title: "Listar alunos",
    hint: "Ler alunos e suas matrículas.",
  },
  "students:write": {
    title: "Gerenciar alunos",
    hint: "Criar, editar e remover alunos.",
  },
  "exams:read": {
    title: "Listar provas",
    hint: "Ler provas e gabaritos.",
  },
  "exams:write": {
    title: "Gerenciar provas",
    hint: "Criar, editar e publicar provas.",
  },
  "submissions:read": {
    title: "Ler submissões",
    hint: "Consultar submissões e notas.",
  },
  "webhooks:manage": {
    title: "Gerenciar webhooks",
    hint: "Criar/remover endpoints de webhook via API.",
  },
};

interface ScopeChecklistProps {
  allScopes: ApiKeyScope[];
  selected: Set<ApiKeyScope>;
  onToggle: (scope: ApiKeyScope) => void;
  disabled?: boolean;
}

export function ScopeChecklist({
  allScopes,
  selected,
  onToggle,
  disabled,
}: ScopeChecklistProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-2">
      {allScopes.map((scope) => {
        const meta = SCOPE_LABELS[scope];
        const isOn = selected.has(scope);
        return (
          <label
            key={scope}
            className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-analytics-primary"
              checked={isOn}
              disabled={disabled}
              onChange={() => onToggle(scope)}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink">{meta.title}</div>
              <div className="text-xs text-gray-500">{meta.hint}</div>
            </div>
            <code className="mt-0.5 shrink-0 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
              {scope}
            </code>
          </label>
        );
      })}
    </div>
  );
}
