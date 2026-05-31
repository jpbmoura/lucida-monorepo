"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PreviousSubmissionDTO } from "../types";

interface AlreadySubmittedProps {
  examTitle: string;
  studentName: string;
  submission: PreviousSubmissionDTO;
  onViewResult: () => Promise<void>;
}

export function AlreadySubmitted({
  examTitle,
  studentName,
  submission,
  onViewResult,
}: AlreadySubmittedProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleView() {
    setLoading(true);
    setError(null);
    try {
      await onViewResult();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const percentage = Math.round(
    (submission.correctCount / submission.questionCount) * 100,
  );
  const when = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(submission.submittedAt));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-12 md:px-0">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Trophy className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            Prova já enviada
          </p>
          <h1 className="text-2xl font-medium leading-tight tracking-tighter text-ink md:text-3xl">
            {studentName}, você já{" "}
            <span className="font-serif font-normal italic text-brand-primary">respondeu</span>{" "}
            essa prova
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {examTitle} · enviada em {when}
          </p>
        </div>

        <div className="mt-2 flex items-end gap-1 font-serif text-6xl italic leading-none text-ink">
          {submission.score.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          <span className="mb-2 text-xl text-gray-400">/10</span>
        </div>
        <p className="text-xs text-gray-500">
          {submission.correctCount} de {submission.questionCount} · {percentage}% de acerto
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleView}
          disabled={loading}
        >
          {loading ? "Carregando..." : "Ver resultado e correção"}
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <p className="text-center text-sm text-gray-500">
        Seu professor recebeu esse resultado. Se algo parece errado, fale com ele.
      </p>
    </div>
  );
}
