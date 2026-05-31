"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { ManualGrading } from "./manual-grading";
import type { SubmissionForGradingDTO } from "../data";

interface GradingDrawerProps {
  examId: string;
  examTitle: string;
  /** IDs das submissões pendentes da prova, em ordem. */
  submissionIds: string[];
  /** Índice inicial dentro de `submissionIds`. */
  startIndex: number;
  onClose: () => void;
}

export function GradingDrawer({
  examId,
  examTitle,
  submissionIds,
  startIndex,
  onClose,
}: GradingDrawerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(startIndex);
  const [data, setData] = useState<SubmissionForGradingDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAny, setSavedAny] = useState(false);

  const currentId = submissionIds[index];
  const hasNext = index < submissionIds.length - 1;

  const close = useCallback(() => {
    if (savedAny) router.refresh();
    onClose();
  }, [savedAny, router, onClose]);

  useEffect(() => {
    if (!currentId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(
      `/v1/exams/${encodeURIComponent(examId)}/submissions/${encodeURIComponent(
        currentId,
      )}/grading`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const b = await res.json().catch(() => null);
          throw new Error(b?.message ?? "Não foi possível carregar a submissão.");
        }
        const { data } = (await res.json()) as { data: SubmissionForGradingDTO };
        if (active) setData(data);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [examId, currentId]);

  // Fecha no Esc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  function handleSaved() {
    setSavedAny(true);
    if (hasNext) {
      setIndex((i) => i + 1);
    } else {
      router.refresh();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={close}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
              Corrigindo · {index + 1} de {submissionIds.length}
            </div>
            <div className="truncate text-sm font-medium text-ink">
              {examTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-gray-300" />
            </div>
          )}
          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {data && !loading && (
            <ManualGrading
              key={currentId}
              examId={examId}
              data={data}
              embedded
              hasNext={hasNext}
              onSaved={handleSaved}
              onClose={close}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
