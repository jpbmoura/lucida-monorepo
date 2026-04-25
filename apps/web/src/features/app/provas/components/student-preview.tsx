"use client";

import { Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedQuestion } from "../types";

interface StudentPreviewProps {
  title: string;
  description: string;
  duration: number;
  questions: GeneratedQuestion[];
}

// Mostra a prova como o aluno vai enxergar: sem gabarito, sem dificuldade,
// sem explicação. Só enunciado, contexto e alternativas com radio em branco.
export function StudentPreview({
  title,
  description,
  duration,
  questions,
}: StudentPreviewProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
          <Eye className="size-3.5" />
          Como o aluno vê
        </div>
        {duration > 0 && (
          <div className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <Clock className="size-3" />
            {duration} min
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-2 border-b border-gray-200 pb-5">
            <h2 className="text-xl font-medium tracking-tight text-ink">
              {title || <span className="text-gray-400">(sem título)</span>}
            </h2>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>

          {questions.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Nenhuma questão para pré-visualizar.
            </div>
          ) : (
            <ol className="flex flex-col gap-8">
              {questions.map((q, i) => (
                <li key={i} className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-lg italic text-gray-400">
                      {i + 1}.
                    </span>
                    <div className="flex-1 space-y-3">
                      {q.context && (
                        <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-600">
                          {q.context}
                        </p>
                      )}
                      <p className="text-sm font-medium leading-relaxed text-ink">
                        {q.statement || (
                          <span className="text-gray-400">(sem enunciado)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <ul className="ml-8 flex flex-col gap-2">
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        className={cn(
                          "flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm",
                        )}
                      >
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-gray-300" />
                        <span className="flex-1 text-gray-700">
                          <span className="mr-2 font-medium text-gray-400">
                            {String.fromCharCode(65 + j)})
                          </span>
                          {opt}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
