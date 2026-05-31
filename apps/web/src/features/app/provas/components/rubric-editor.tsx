"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  RubricCriterionDraft,
  RubricDraft,
  RubricLevelDraft,
} from "../types";

function rid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function rubricMaxPoints(rubric: RubricDraft): number {
  return rubric.criteria.reduce(
    (sum, c) => sum + Math.max(0, ...c.levels.map((l) => l.points)),
    0,
  );
}

interface RubricEditorProps {
  rubric: RubricDraft;
  onChange: (rubric: RubricDraft) => void;
}

export function RubricEditor({ rubric, onChange }: RubricEditorProps) {
  function patchCriterion(ci: number, patch: Partial<RubricCriterionDraft>) {
    onChange({
      criteria: rubric.criteria.map((c, i) =>
        i === ci ? { ...c, ...patch } : c,
      ),
    });
  }

  function addCriterion() {
    onChange({
      criteria: [
        ...rubric.criteria,
        {
          id: rid(),
          name: `Critério ${rubric.criteria.length + 1}`,
          description: null,
          levels: [
            { id: rid(), label: "Insuficiente", points: 0, descriptor: "" },
            { id: rid(), label: "Completo", points: 2, descriptor: "" },
          ],
        },
      ],
    });
  }

  function removeCriterion(ci: number) {
    if (rubric.criteria.length <= 1) return;
    onChange({ criteria: rubric.criteria.filter((_, i) => i !== ci) });
  }

  function patchLevel(ci: number, li: number, patch: Partial<RubricLevelDraft>) {
    onChange({
      criteria: rubric.criteria.map((c, i) =>
        i === ci
          ? {
              ...c,
              levels: c.levels.map((l, j) =>
                j === li ? { ...l, ...patch } : l,
              ),
            }
          : c,
      ),
    });
  }

  function addLevel(ci: number) {
    onChange({
      criteria: rubric.criteria.map((c, i) =>
        i === ci
          ? {
              ...c,
              levels: [
                ...c.levels,
                { id: rid(), label: "Novo nível", points: 0, descriptor: "" },
              ],
            }
          : c,
      ),
    });
  }

  function removeLevel(ci: number, li: number) {
    const c = rubric.criteria[ci];
    if (!c || c.levels.length <= 2) return;
    patchCriterion(ci, { levels: c.levels.filter((_, j) => j !== li) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
          Rubrica
        </span>
        <span className="text-[11px] tabular-nums text-gray-500">
          Nota máxima: {rubricMaxPoints(rubric)} pts
        </span>
      </div>

      {rubric.criteria.map((c, ci) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/40 p-4"
        >
          <div className="flex items-start gap-2">
            <input
              value={c.name}
              onChange={(e) => patchCriterion(ci, { name: e.target.value })}
              placeholder="Nome do critério"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-ink focus:border-brand-primary focus:outline-none"
            />
            {rubric.criteria.length > 1 && (
              <button
                type="button"
                onClick={() => removeCriterion(ci)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Remover critério"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>

          <input
            value={c.description ?? ""}
            onChange={(e) =>
              patchCriterion(ci, { description: e.target.value || null })
            }
            placeholder="Descrição (opcional)"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 focus:border-brand-primary focus:outline-none"
          />

          <div className="flex flex-col gap-2">
            {c.levels.map((l, li) => (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2"
              >
                <input
                  value={l.label}
                  onChange={(e) =>
                    patchLevel(ci, li, { label: e.target.value })
                  }
                  placeholder="Nível"
                  className="w-28 shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-ink focus:border-brand-primary focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={l.points}
                  onChange={(e) =>
                    patchLevel(ci, li, { points: Number(e.target.value) || 0 })
                  }
                  className="w-16 shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs tabular-nums text-ink focus:border-brand-primary focus:outline-none"
                  title="Pontos"
                />
                <input
                  value={l.descriptor}
                  onChange={(e) =>
                    patchLevel(ci, li, { descriptor: e.target.value })
                  }
                  placeholder="O que caracteriza este nível…"
                  className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:border-brand-primary focus:outline-none"
                />
                {c.levels.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLevel(ci, li)}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Remover nível"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addLevel(ci)}
              className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-brand-primary"
            >
              <Plus className="size-3" />
              Adicionar nível
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCriterion}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-brand-primary hover:text-brand-primary"
      >
        <Plus className="size-3.5" />
        Adicionar critério
      </button>
    </div>
  );
}
