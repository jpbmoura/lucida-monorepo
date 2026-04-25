"use client";

import { useState } from "react";
import { ChevronDown, Trash2, Check, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { GeneratedQuestion } from "../types";

interface QuestionEditorProps {
  index: number;
  question: GeneratedQuestion;
  onChange: (patch: Partial<GeneratedQuestion>) => void;
  onRemove: () => void;
  onRegenerate?: () => Promise<void> | void;
  defaultExpanded?: boolean;
  /** Desativa o acordeon — corpo sempre visível, sem chevron. */
  alwaysExpanded?: boolean;
}

const DIFFICULTY_CLASS: Record<string, string> = {
  fácil: "bg-emerald-50 text-emerald-700",
  médio: "bg-amber-50 text-amber-700",
  difícil: "bg-red-50 text-red-700",
};

export function QuestionEditor({
  index,
  question,
  onChange,
  onRemove,
  onRegenerate,
  defaultExpanded = false,
  alwaysExpanded = false,
}: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || alwaysExpanded);
  const [regenerating, setRegenerating] = useState(false);

  const isOpen = alwaysExpanded || expanded;

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
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
        <span className="grid size-7 place-items-center rounded-lg bg-gray-50 font-serif text-sm italic text-gray-500">
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
        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
          {question.type === "multipleChoice" ? "múltipla" : "V/F"}
        </span>

        {!alwaysExpanded && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">
              {question.statement || (
                <span className="text-gray-400">(sem enunciado)</span>
              )}
            </p>
          </div>
        )}
        {alwaysExpanded && <div className="flex-1" />}

        {onRegenerate && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Regerar questão"
            title="Regerar com a Lulu"
            className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary disabled:opacity-40"
          >
            <RefreshCw
              className={cn("size-4", regenerating && "animate-spin")}
            />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover questão"
          className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4" />
        </button>
        {!alwaysExpanded && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Recolher" : "Expandir"}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 hover:text-ink",
              expanded && "rotate-180",
            )}
          >
            <ChevronDown className="size-4" />
          </button>
        )}
      </header>

      {isOpen && (
        <div className="flex flex-col gap-5 px-5 py-5">
          {question.context !== null && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`q${index}-context`}>Contexto</Label>
              <Textarea
                id={`q${index}-context`}
                value={question.context}
                onChange={(e) => onChange({ context: e.target.value })}
                className="min-h-[90px]"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`q${index}-statement`}>Enunciado</Label>
            <Textarea
              id={`q${index}-statement`}
              value={question.statement}
              onChange={(e) => onChange({ statement: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Alternativas</Label>
            <ul className="flex flex-col gap-2">
              {question.options.map((opt, i) => {
                const isCorrect = question.correctAnswer === i;
                return (
                  <li key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChange({ correctAnswer: i })}
                      aria-label={`Marcar alternativa ${i + 1} como correta`}
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg border transition-colors",
                        isCorrect
                          ? "border-brand-primary bg-brand-primary text-white"
                          : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600",
                      )}
                    >
                      {isCorrect ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        <span className="text-xs font-medium">
                          {String.fromCharCode(65 + i)}
                        </span>
                      )}
                    </button>
                    {question.type === "trueFalse" ? (
                      <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">
                        {opt}
                      </div>
                    ) : (
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const next = [...question.options];
                          next[i] = e.target.value;
                          onChange({ options: next });
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`q${index}-explanation`}>Explicação / gabarito comentado</Label>
            <Textarea
              id={`q${index}-explanation`}
              value={question.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
              className="min-h-[70px]"
            />
          </div>
        </div>
      )}
    </article>
  );
}
