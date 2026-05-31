"use client";

import { Trash2, PenLine, RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RubricEditor } from "./rubric-editor";
import type { GeneratedQuestion, RubricDraft } from "../types";

// Dificuldade vem da IA já calibrada (taxonomia de Bloom) — exibida como badge,
// não editável. Espelha o editor objetivo.
const DIFFICULTY_CLASS: Record<string, string> = {
  fácil: "bg-emerald-50 text-emerald-700",
  médio: "bg-amber-50 text-amber-700",
  difícil: "bg-red-50 text-red-700",
};

interface OpenQuestionEditorProps {
  index: number;
  question: GeneratedQuestion;
  onChange: (patch: Partial<GeneratedQuestion>) => void;
  onRemove: () => void;
  /** Regerar esta questão com a Lulu (mesma capacidade das objetivas). */
  onRegenerate?: () => Promise<void> | void;
}

export function OpenQuestionEditor({
  index,
  question,
  onChange,
  onRemove,
  onRegenerate,
}: OpenQuestionEditorProps) {
  const rubric: RubricDraft = question.rubric ?? { criteria: [] };
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    if (!onRegenerate || regenerating) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-gray-50 font-serif text-xs italic text-gray-500">
            {index + 1}
          </span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]",
              DIFFICULTY_CLASS[question.difficulty] ?? "bg-gray-100 text-gray-600",
            )}
          >
            {question.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-violet-700">
            <PenLine className="size-3" />
            Discursiva
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              aria-label="Regerar questão"
              title="Regerar com a Lulu"
              className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary disabled:opacity-40"
            >
              <RefreshCw className={cn("size-4", regenerating && "animate-spin")} />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Remover questão"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {question.context !== null && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">
            Contexto (opcional)
          </label>
          <textarea
            value={question.context ?? ""}
            onChange={(e) => onChange({ context: e.target.value || null })}
            placeholder="Situação ou texto de apoio…"
            rows={2}
            className={cn(
              "w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-600",
              "placeholder:text-gray-400 focus:border-brand-primary focus:outline-none",
            )}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">
          Enunciado
        </label>
        <textarea
          value={question.statement}
          onChange={(e) => onChange({ statement: e.target.value })}
          placeholder="O que o aluno deve responder…"
          rows={3}
          className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-gray-400 focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">
          Resposta de referência (opcional)
        </label>
        <textarea
          value={question.referenceAnswer ?? ""}
          onChange={(e) => onChange({ referenceAnswer: e.target.value })}
          placeholder="Resposta-modelo — guia a correção (manual e por IA)."
          rows={2}
          className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-600 placeholder:text-gray-400 focus:border-brand-primary focus:outline-none"
        />
      </div>

      <RubricEditor
        rubric={rubric}
        onChange={(next) => onChange({ rubric: next })}
      />
    </div>
  );
}
