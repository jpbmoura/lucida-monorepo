"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Clock, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ExamSession,
  IntegrityFlags,
  PublicExamDTO,
  SubmissionEndReason,
} from "../types";

interface SubmitPayload {
  answers: Array<number | null>;
  endReason: SubmissionEndReason;
  integrityFlags: IntegrityFlags;
}

interface ExamTakingProps {
  exam: PublicExamDTO;
  studentName: string;
  session: ExamSession;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
}

const MAX_VIOLATIONS = 3;

const INITIAL_FLAGS: IntegrityFlags = {
  tabSwitches: 0,
  focusLosses: 0,
  copyAttempts: 0,
  rightClickAttempts: 0,
  violationCount: 0,
};

export function ExamTaking({
  exam,
  studentName,
  session,
  onSubmit,
}: ExamTakingProps) {
  const strict = exam.securityLevel === "strict";

  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    exam.questions.map(() => null),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnansweredWarn, setShowUnansweredWarn] = useState(false);

  const [flags, setFlags] = useState<IntegrityFlags>(INITIAL_FLAGS);
  const [violationToast, setViolationToast] = useState<string | null>(null);

  const [remaining, setRemaining] = useState<number | null>(() =>
    computeRemaining(session.deadline),
  );

  const answersRef = useRef(answers);
  const flagsRef = useRef(flags);
  const submittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    flagsRef.current = flags;
  }, [flags]);

  const finalize = useCallback(
    async (endReason: SubmissionEndReason) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setBusy(true);
      try {
        await onSubmit({
          answers: answersRef.current,
          endReason,
          integrityFlags: flagsRef.current,
        });
      } catch (err) {
        submittedRef.current = false;
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [onSubmit],
  );

  // Timer countdown.
  useEffect(() => {
    if (session.deadline === null) return;
    const tick = () => {
      const rem = computeRemaining(session.deadline);
      setRemaining(rem);
      if (rem !== null && rem <= 0 && !submittedRef.current) {
        void finalize("time_expired");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session.deadline, finalize]);

  // Strict-mode violation handling.
  const registerViolation = useCallback(
    (patch: Partial<IntegrityFlags>, toast: string) => {
      if (submittedRef.current) return;
      setFlags((prev) => {
        const next: IntegrityFlags = {
          ...prev,
          ...Object.fromEntries(
            Object.entries(patch).map(([k, v]) => [
              k,
              (prev[k as keyof IntegrityFlags] as number) + (v as number),
            ]),
          ),
          violationCount: prev.violationCount + 1,
        } as IntegrityFlags;
        if (next.violationCount >= MAX_VIOLATIONS) {
          flagsRef.current = next;
          void finalize("violation");
        }
        return next;
      });
      setViolationToast(toast);
      window.setTimeout(() => setViolationToast(null), 4000);
    },
    [finalize],
  );

  // Strict-mode listeners.
  useEffect(() => {
    if (!strict) return;

    const onVisibility = () => {
      if (document.hidden) {
        registerViolation(
          { tabSwitches: 1 },
          "Você saiu da aba da prova. Isso conta como violação.",
        );
      }
    };
    const onBlur = () => {
      registerViolation(
        { focusLosses: 1 },
        "A janela da prova perdeu o foco. Isso conta como violação.",
      );
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      registerViolation(
        { rightClickAttempts: 1 },
        "Menu de contexto bloqueado durante a prova.",
      );
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      registerViolation(
        { copyAttempts: 1 },
        "Cópia bloqueada durante a prova.",
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked =
        (ctrl && (k === "c" || k === "x" || k === "v" || k === "a" || k === "p" || k === "s" || k === "u")) ||
        (e.ctrlKey && e.shiftKey && (k === "i" || k === "j" || k === "c")) ||
        k === "f12";
      if (blocked) {
        e.preventDefault();
        registerViolation(
          { copyAttempts: 1 },
          "Atalho bloqueado durante a prova.",
        );
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [strict, registerViolation]);

  const answeredCount = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers],
  );
  const unanswered = exam.questions.length - answeredCount;

  function setAnswer(qIndex: number, optIndex: number) {
    setAnswers((prev) => prev.map((a, i) => (i === qIndex ? optIndex : a)));
  }

  async function handleSubmit() {
    if (unanswered > 0 && !showUnansweredWarn) {
      setShowUnansweredWarn(true);
      return;
    }
    setError(null);
    await finalize("submitted");
  }

  const remainingLow =
    remaining !== null && remaining <= 60 && remaining > 0;
  const remainingVeryLow =
    remaining !== null && remaining <= 10 && remaining > 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-8 pb-32",
        strict && "select-none",
      )}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
          <span>Respondendo como</span>
          <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 font-semibold text-brand-primary">
            {studentName}
          </span>
          {strict && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
              <ShieldAlert className="size-3" />
              Modo estrito
            </span>
          )}
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          {exam.title}
        </h1>
        {exam.description && (
          <p className="text-[15px] text-gray-500">{exam.description}</p>
        )}
      </header>

      <ol className="flex flex-col gap-6">
        {exam.questions.map((q, i) => (
          <li
            key={i}
            className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-xl italic text-gray-400">
                {i + 1}.
              </span>
              <div className="flex-1 space-y-3">
                {q.context && (
                  <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">
                    {q.context}
                  </p>
                )}
                <p className="text-[15px] font-medium leading-relaxed text-ink">
                  {q.statement}
                </p>
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {q.options.map((opt, j) => {
                const selected = answers[i] === j;
                return (
                  <li key={j}>
                    <button
                      type="button"
                      onClick={() => setAnswer(i, j)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-brand-primary bg-brand-primary/5 text-ink"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                          selected
                            ? "border-brand-primary bg-brand-primary"
                            : "border-gray-300 bg-white",
                        )}
                      >
                        {selected && (
                          <span className="size-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="mr-2 font-medium text-gray-400">
                          {String.fromCharCode(65 + j)})
                        </span>
                        {opt}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {violationToast && (
        <div
          role="alert"
          className="fixed left-1/2 top-6 z-30 flex max-w-md -translate-x-1/2 items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-medium">{violationToast}</div>
            <div className="mt-0.5 text-[12px] text-amber-700">
              Violações: {flags.violationCount} / {MAX_VIOLATIONS} — a 3ª
              finaliza a prova.
            </div>
          </div>
        </div>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="tabular-nums">
              {answeredCount} / {exam.questions.length}
            </span>
            {remaining !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 tabular-nums",
                  remainingLow && "bg-amber-100 text-amber-800",
                  remainingVeryLow && "bg-red-100 text-red-700",
                )}
                aria-live="polite"
              >
                <Clock className="size-3.5" />
                {formatTime(remaining)}
              </span>
            )}
            {showUnansweredWarn && unanswered > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertCircle className="size-3.5" />
                {unanswered} em branco — enviar mesmo assim?
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={busy}
          >
            <Send className="size-4" strokeWidth={2.5} />
            {busy
              ? "Enviando..."
              : showUnansweredWarn && unanswered > 0
                ? "Enviar com branco"
                : "Enviar prova"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function computeRemaining(deadline: number | null): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
