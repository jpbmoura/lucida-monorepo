"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postSseExpectingResult, SseHttpError } from "../sse-client";

interface GradingEstimate {
  estimatedCredits: number;
  totalAnswers: number;
  perStudent: Array<{
    submissionId: string;
    studentName: string;
    answers: number;
    credits: number;
  }>;
}

interface GradeRunResult {
  gradedSubmissions: number;
  gradedAnswers: number;
  creditsSpent: number;
}

type Phase = "idle" | "estimating" | "confirm" | "running" | "approving";

interface AiGradingPanelProps {
  examId: string;
  /** Submissões com rascunho da IA aguardando aprovação. */
  draftSubmissionIds: string[];
}

export function AiGradingPanel({ examId, draftSubmissionIds }: AiGradingPanelProps) {
  const router = useRouter();
  const [estimate, setEstimate] = useState<GradingEstimate | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<{ graded: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const busy = phase === "estimating" || phase === "running" || phase === "approving";

  async function loadEstimate() {
    setError(null);
    setPhase("estimating");
    try {
      const res = await fetch("/v1/ai/grading/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.message ?? "Não foi possível estimar o custo.");
      }
      const { data } = (await res.json()) as { data: GradingEstimate };
      if (data.totalAnswers === 0) {
        setError("Nada novo para corrigir por IA no momento.");
        setPhase("idle");
        return;
      }
      setEstimate(data);
      setPhase("confirm");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  async function run() {
    setError(null);
    setPhase("running");
    setProgress(null);
    try {
      await postSseExpectingResult<GradeRunResult>(
        "/v1/ai/grading/run",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ examId }),
        },
        {
          onProgress: (p) =>
            setProgress(p as unknown as { graded: number; total: number }),
        },
      );
      setEstimate(null);
      setPhase("idle");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof SseHttpError ? e.message : (e as Error).message,
      );
      setPhase("idle");
    }
  }

  async function approveAll() {
    if (draftSubmissionIds.length === 0) return;
    setError(null);
    setPhase("approving");
    try {
      for (const id of draftSubmissionIds) {
        const res = await fetch(
          `/v1/exams/${encodeURIComponent(examId)}/submissions/${encodeURIComponent(
            id,
          )}/approve-grades`,
          { method: "POST" },
        );
        if (!res.ok) {
          const b = await res.json().catch(() => null);
          throw new Error(b?.message ?? "Falha ao aprovar as sugestões.");
        }
      }
      setPhase("idle");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-violet-100 text-violet-600">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-medium text-ink">Correção por IA</h3>
            <p className="text-xs text-gray-500">
              A IA corrige pela rubrica; você revisa e aprova — a palavra final é sua.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {draftSubmissionIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={approveAll}
              disabled={busy}
            >
              {phase === "approving" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Aprovar {draftSubmissionIds.length} sugest{draftSubmissionIds.length === 1 ? "ão" : "ões"}
            </Button>
          )}
          {phase !== "confirm" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={loadEstimate}
              disabled={busy}
            >
              {phase === "estimating" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Corrigir com IA
            </Button>
          )}
        </div>
      </div>

      {phase === "confirm" && estimate && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-600">
            Corrigir <strong>{estimate.totalAnswers}</strong>{" "}
            {estimate.totalAnswers === 1 ? "resposta" : "respostas"} de{" "}
            <strong>{estimate.perStudent.length}</strong>{" "}
            {estimate.perStudent.length === 1 ? "aluno" : "alunos"} — custo estimado{" "}
            <strong className="tabular-nums">
              {estimate.estimatedCredits.toLocaleString("pt-BR")} créditos
            </strong>
            .
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEstimate(null);
                setPhase("idle");
              }}
            >
              <X className="size-4" />
              Cancelar
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={run}>
              <Sparkles className="size-4" />
              Confirmar e corrigir
            </Button>
          </div>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-200 bg-white px-4 py-3">
          <Loader2 className="size-4 shrink-0 animate-spin text-violet-600" />
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Corrigindo com IA
              {progress ? ` — ${progress.graded} de ${progress.total} alunos` : "…"}
            </p>
            {progress && progress.total > 0 && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${(progress.graded / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
