"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Save, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import { gradeOpenAnswersAction } from "../actions";
import type {
  RubricDTO,
  SubmissionForGradingDTO,
} from "../data";

interface ManualGradingProps {
  examId: string;
  data: SubmissionForGradingDTO;
  /**
   * Modo embutido (drawer da fila de correção): muda o container/rodapé e
   * delega a navegação ao caller via callbacks abaixo. Default: false (rota
   * cheia /app/provas/[id]/corrigir/[submissionId]).
   */
  embedded?: boolean;
  /** Chamado após salvar com sucesso, em vez de navegar de volta pra prova. */
  onSaved?: (submissionId: string) => void;
  /** Chamado pelo botão "Voltar"/fechar quando embutido. */
  onClose?: () => void;
  /** Há mais submissões pendentes na fila → rótulo "Salvar e próxima". */
  hasNext?: boolean;
}

interface CriterionState {
  levelId: string;
  feedback: string;
}

interface QuestionState {
  criteria: Record<string, CriterionState>;
  /** Sobreposição da nota final em pontos (texto do input); vazio = usar rubrica. */
  overrideText: string;
}

const EMPTY_QUESTION_STATE: QuestionState = { criteria: {}, overrideText: "" };

function rubricMax(rubric: RubricDTO): number {
  return rubric.criteria.reduce(
    (sum, c) => sum + Math.max(0, ...c.levels.map((l) => l.points)),
    0,
  );
}

function initState(
  data: SubmissionForGradingDTO,
): Record<number, QuestionState> {
  const out: Record<number, QuestionState> = {};
  for (const q of data.openQuestions) {
    const criteria: Record<string, CriterionState> = {};
    for (const c of q.rubric.criteria) {
      const existing = q.grade?.criteria.find((gc) => gc.criterionId === c.id);
      criteria[c.id] = {
        levelId: existing?.levelId ?? "",
        feedback: existing?.feedback ?? "",
      };
    }
    const max = rubricMax(q.rubric);
    const overrideText =
      q.grade?.overriddenFraction != null
        ? String(Math.round(q.grade.overriddenFraction * max * 100) / 100)
        : "";
    out[q.questionIndex] = { criteria, overrideText };
  }
  return out;
}

export function ManualGrading({
  examId,
  data,
  embedded = false,
  onSaved,
  onClose,
  hasNext = false,
}: ManualGradingProps) {
  const router = useRouter();
  const [state, setState] = useState<Record<number, QuestionState>>(() =>
    initState(data),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function setLevel(qIndex: number, criterionId: string, levelId: string) {
    setState((prev) => {
      const q = prev[qIndex];
      if (!q) return prev;
      return {
        ...prev,
        [qIndex]: {
          ...q,
          criteria: {
            ...q.criteria,
            [criterionId]: {
              levelId,
              feedback: q.criteria[criterionId]?.feedback ?? "",
            },
          },
        },
      };
    });
  }

  function setFeedback(qIndex: number, criterionId: string, feedback: string) {
    setState((prev) => {
      const q = prev[qIndex];
      if (!q) return prev;
      return {
        ...prev,
        [qIndex]: {
          ...q,
          criteria: {
            ...q.criteria,
            [criterionId]: {
              levelId: q.criteria[criterionId]?.levelId ?? "",
              feedback,
            },
          },
        },
      };
    });
  }

  function setOverride(qIndex: number, overrideText: string) {
    setState((prev) => {
      const q = prev[qIndex];
      if (!q) return prev;
      return { ...prev, [qIndex]: { ...q, overrideText } };
    });
  }

  // Todos os critérios de todas as questões precisam de um nível escolhido.
  const allSelected = useMemo(
    () =>
      data.openQuestions.every((q) =>
        q.rubric.criteria.every(
          (c) => state[q.questionIndex]?.criteria[c.id]?.levelId,
        ),
      ),
    [data.openQuestions, state],
  );

  async function handleSave() {
    setError(null);
    const grades = data.openQuestions.map((q) => {
      const qs = state[q.questionIndex] ?? EMPTY_QUESTION_STATE;
      const max = rubricMax(q.rubric);
      const overrideNum =
        qs.overrideText.trim() !== ""
          ? Number(qs.overrideText.replace(",", "."))
          : null;
      const overrideFraction =
        overrideNum != null && Number.isFinite(overrideNum) && max > 0
          ? Math.min(1, Math.max(0, overrideNum / max))
          : null;
      return {
        questionIndex: q.questionIndex,
        criteria: q.rubric.criteria
          .map((c) => ({
            criterionId: c.id,
            levelId: qs.criteria[c.id]?.levelId ?? "",
            feedback: qs.criteria[c.id]?.feedback ?? "",
          }))
          .filter((c) => c.levelId),
        overrideFraction,
      };
    });

    startSaving(async () => {
      const result = await gradeOpenAnswersAction(
        examId,
        data.submissionId,
        { grades },
      );
      if (!result.ok) {
        setError(result.error?.message ?? "Não foi possível salvar a correção.");
        return;
      }
      if (onSaved) {
        onSaved(data.submissionId);
        return;
      }
      router.push(`/app/provas/${examId}`);
      router.refresh();
    });
  }

  function handleBack() {
    if (onClose) {
      onClose();
      return;
    }
    router.push(`/app/provas/${examId}`);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-8",
        embedded ? "pb-28" : "mx-auto max-w-3xl pb-32",
      )}
    >
      <header className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {embedded ? "Fechar" : "Voltar para a prova"}
        </button>
        <div>
          <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink">
            Corrigir discursivas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.studentName} · código {data.studentCode} ·{" "}
            {data.openQuestions.length}{" "}
            {data.openQuestions.length === 1 ? "questão" : "questões"} para corrigir
          </p>
        </div>
      </header>

      <ol className="flex flex-col gap-8">
        {data.openQuestions.map((q) => {
          const qs = state[q.questionIndex] ?? EMPTY_QUESTION_STATE;
          const max = rubricMax(q.rubric);
          const earned = q.rubric.criteria.reduce((sum, c) => {
            const levelId = qs.criteria[c.id]?.levelId;
            const level = c.levels.find((l) => l.id === levelId);
            return sum + (level?.points ?? 0);
          }, 0);
          const overrideNum =
            qs.overrideText.trim() !== ""
              ? Number(qs.overrideText.replace(",", "."))
              : null;
          const finalPoints =
            overrideNum != null && Number.isFinite(overrideNum)
              ? overrideNum
              : earned;
          const pct = max > 0 ? Math.round((finalPoints / max) * 100) : 0;

          return (
            <li
              key={q.questionIndex}
              className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6"
            >
              {q.grade?.source === "ai" && q.grade?.status === "ai_suggested" && (
                <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                  <Sparkles className="size-3.5" />
                  Sugestão da IA — revise os níveis e o feedback e salve para aprovar.
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-xl italic text-gray-400">
                    {q.questionIndex + 1}.
                  </span>
                  <div className="flex flex-col gap-2">
                    {q.context && (
                      <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">
                        <RichText text={q.context} />
                      </p>
                    )}
                    <p className="text-[15px] font-medium leading-relaxed text-ink">
                      <RichText text={q.statement} />
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums",
                    pct >= 60
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {Math.round(finalPoints * 100) / 100}/{max}
                </span>
              </div>

              {/* Resposta do aluno (entrada não-confiável; só exibição). */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">
                  Resposta do aluno
                </div>
                {q.studentAnswer ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {q.studentAnswer}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-400">Em branco</p>
                )}
              </div>

              {q.referenceAnswer && (
                <div className="rounded-xl border border-sky-100 bg-sky-50/40 px-4 py-3">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-sky-500">
                    Resposta de referência
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    <RichText text={q.referenceAnswer} />
                  </p>
                </div>
              )}

              {/* Rubrica: critérios × níveis */}
              <div className="flex flex-col gap-5">
                {q.rubric.criteria.map((c) => {
                  const selectedLevelId = qs?.criteria[c.id]?.levelId ?? "";
                  return (
                    <div key={c.id} className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-ink">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          até {Math.max(0, ...c.levels.map((l) => l.points))} pts
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-gray-500">{c.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {c.levels.map((l) => {
                          const active = selectedLevelId === l.id;
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setLevel(q.questionIndex, c.id, l.id)}
                              title={l.descriptor}
                              className={cn(
                                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                                active
                                  ? "border-brand-primary bg-brand-primary/5 text-ink"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                              )}
                            >
                              {active && (
                                <Check className="size-3.5 text-brand-primary" />
                              )}
                              <span className="font-medium">{l.label}</span>
                              <span className="tabular-nums text-gray-400">
                                {l.points}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedLevelId && (
                        <p className="text-xs italic text-gray-500">
                          {
                            c.levels.find((l) => l.id === selectedLevelId)
                              ?.descriptor
                          }
                        </p>
                      )}
                      <textarea
                        value={qs?.criteria[c.id]?.feedback ?? ""}
                        onChange={(e) =>
                          setFeedback(q.questionIndex, c.id, e.target.value)
                        }
                        placeholder="Feedback pro aluno neste critério (opcional)…"
                        rows={2}
                        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-ink placeholder:text-gray-400 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Sobreposição opcional da nota final */}
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 px-4 py-3">
                <label className="text-xs text-gray-500" htmlFor={`ovr-${q.questionIndex}`}>
                  Ajustar nota final (opcional, 0–{max}):
                </label>
                <input
                  id={`ovr-${q.questionIndex}`}
                  type="number"
                  min={0}
                  max={max}
                  step="0.5"
                  value={qs?.overrideText ?? ""}
                  onChange={(e) => setOverride(q.questionIndex, e.target.value)}
                  placeholder={String(earned)}
                  className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm tabular-nums text-ink focus:border-brand-primary focus:outline-none"
                />
                <span className="text-xs text-gray-400">≈ {pct}%</span>
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <footer
        className={cn(
          "z-10 border-t border-gray-100 bg-white/95 backdrop-blur",
          embedded
            ? "sticky bottom-0 -mx-6 px-6 py-4"
            : "fixed inset-x-0 bottom-0 px-5 py-4 md:px-10",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            !embedded && "mx-auto max-w-3xl",
          )}
        >
          {!allSelected ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
              <AlertCircle className="size-3.5" />
              Escolha um nível em cada critério para salvar.
            </span>
          ) : (
            <span className="text-xs text-gray-400">
              A nota da prova é recomposta ao salvar.
            </span>
          )}
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={saving || !allSelected}
          >
            <Save className="size-4" strokeWidth={2.5} />
            {saving
              ? "Salvando..."
              : embedded && hasNext
                ? "Salvar e próxima"
                : "Salvar correção"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
