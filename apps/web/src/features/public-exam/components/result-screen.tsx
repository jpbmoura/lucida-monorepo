"use client";

import { CheckCircle2, XCircle, MinusCircle, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichText } from "@/components/rich-text";
import type { PublicExamDTO, ResultView } from "../types";

interface ResultScreenProps {
  exam: PublicExamDTO;
  studentName: string;
  answers: Array<number | null>;
  textAnswers: Array<string | null>;
  result: ResultView;
}

export function ResultScreen({
  exam,
  studentName,
  answers,
  textAnswers,
  result,
}: ResultScreenProps) {
  const percentage = Math.round((result.correctCount / result.questionCount) * 100);
  const awaitingGrading = result.gradingStatus === "pending";

  return (
    <div className="flex flex-col gap-10 pb-16">
      <header className="flex flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Trophy className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            Prova enviada
          </p>
          <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
            Boa,{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              {studentName.split(" ")[0]}
            </span>
            !
          </h1>
          <p className="text-sm text-gray-500">
            Sua resposta foi registrada e o professor já pode ver o resultado.
          </p>
        </div>

        <div className="mt-2 flex items-end gap-1 font-serif text-7xl italic leading-none text-ink">
          {result.score.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          <span className="mb-2 text-2xl text-gray-400">/10</span>
        </div>
        <p className="text-xs text-gray-500">
          {result.correctCount} de {result.questionCount} · {percentage}% de acerto
        </p>

        {awaitingGrading && (
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            <Clock className="size-3.5" />
            Nota parcial — questões discursivas aguardando correção do professor.
          </p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
          Gabarito comentado
        </div>
        <ol className="flex flex-col gap-3">
          {exam.questions.map((q, i) => {
            const qType = result.questionResults[i]?.type ?? q.type;

            // Discursiva: mostra a resposta digitada. Se já corrigida, mostra a
            // rubrica (nível + feedback por critério) e a fração obtida (P-B);
            // senão, selo de pendência.
            if (qType === "open") {
              const typed = textAnswers[i];
              const hasAnswer =
                typeof typed === "string" && typed.trim().length > 0;
              const grade = result.questionResults[i]?.grade ?? null;
              const pct =
                grade && grade.max > 0
                  ? Math.round((grade.earned / grade.max) * 100)
                  : 0;
              return (
                <li
                  key={i}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border bg-white p-5",
                    grade ? "border-emerald-200" : "border-amber-200",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-lg bg-gray-50 font-serif text-xs italic text-gray-500">
                      {i + 1}
                    </span>
                    {grade ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-emerald-700">
                        <CheckCircle2 className="size-3" />
                        Corrigida · {grade.earned}/{grade.max} ({pct}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-amber-700">
                        <Clock className="size-3" />
                        Aguardando correção
                      </span>
                    )}
                  </div>

                  {q.context && (
                    <p className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 text-sm leading-relaxed text-gray-600">
                      <RichText text={q.context} />
                    </p>
                  )}
                  <p className="text-sm font-medium leading-relaxed text-ink">
                    <RichText text={q.statement} />
                  </p>

                  <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-3.5 py-3 text-[13px] leading-relaxed">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">
                      Sua resposta
                    </div>
                    {hasAnswer ? (
                      <p className="whitespace-pre-wrap text-gray-700">{typed}</p>
                    ) : (
                      <p className="italic text-gray-400">Em branco</p>
                    )}
                  </div>

                  {grade && grade.criteria.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Correção por critério
                      </div>
                      {grade.criteria.map((c, ci) => (
                        <div
                          key={ci}
                          className="rounded-xl border border-gray-100 px-3.5 py-2.5"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[13px] font-medium text-ink">
                              {c.name}
                            </span>
                            <span className="shrink-0 text-[11px] tabular-nums text-gray-500">
                              {c.levelLabel} · {c.points}/{c.maxPoints}
                            </span>
                          </div>
                          {c.feedback && (
                            <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
                              {c.feedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            }

            const studentAnswer = answers[i];
            const correct = result.questionResults[i]?.correctAnswer;
            const explanation = result.questionResults[i]?.explanation;
            const isCorrect =
              studentAnswer !== null &&
              studentAnswer !== undefined &&
              studentAnswer === correct;
            const isBlank = studentAnswer === null || studentAnswer === undefined;

            return (
              <li
                key={i}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border bg-white p-5",
                  isCorrect
                    ? "border-emerald-200"
                    : isBlank
                      ? "border-gray-200"
                      : "border-red-200",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-gray-50 font-serif text-xs italic text-gray-500">
                    {i + 1}
                  </span>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-emerald-700">
                      <CheckCircle2 className="size-3" />
                      Acertou
                    </span>
                  ) : isBlank ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-gray-600">
                      <MinusCircle className="size-3" />
                      Em branco
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-red-700">
                      <XCircle className="size-3" />
                      Errou
                    </span>
                  )}
                </div>

                {q.context && (
                  <p className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 text-sm leading-relaxed text-gray-600">
                    <RichText text={q.context} />
                  </p>
                )}
                <p className="text-sm font-medium leading-relaxed text-ink">
                  <RichText text={q.statement} />
                </p>

                <ul className="flex flex-col gap-1.5">
                  {q.options.map((opt, j) => {
                    const isMyAnswer = studentAnswer === j;
                    const isCorrectOpt = correct === j;
                    return (
                      <li
                        key={j}
                        className={cn(
                          "flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm",
                          isCorrectOpt
                            ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                            : isMyAnswer
                              ? "border-red-200 bg-red-50/60 text-red-900"
                              : "border-gray-100 text-gray-600",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-medium",
                            isCorrectOpt
                              ? "bg-emerald-600 text-white"
                              : isMyAnswer
                                ? "bg-red-500 text-white"
                                : "bg-gray-100 text-gray-400",
                          )}
                        >
                          {String.fromCharCode(65 + j)}
                        </span>
                        <span className="flex-1">
                          <RichText text={opt} />
                        </span>
                        {isCorrectOpt && (
                          <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-emerald-700">
                            correta
                          </span>
                        )}
                        {isMyAnswer && !isCorrectOpt && (
                          <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-red-700">
                            sua resposta
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {explanation && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-3.5 py-3 text-[13px] leading-relaxed text-gray-600">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">
                      Por quê
                    </div>
                    <RichText text={explanation} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
