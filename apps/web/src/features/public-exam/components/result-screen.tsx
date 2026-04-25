"use client";

import { CheckCircle2, XCircle, MinusCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicExamDTO, SubmitExamResponse } from "../types";

interface ResultScreenProps {
  exam: PublicExamDTO;
  studentName: string;
  answers: Array<number | null>;
  result: SubmitExamResponse;
}

export function ResultScreen({
  exam,
  studentName,
  answers,
  result,
}: ResultScreenProps) {
  const percentage = Math.round((result.correctCount / result.questionCount) * 100);

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
      </header>

      <section className="flex flex-col gap-3">
        <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
          Gabarito comentado
        </div>
        <ol className="flex flex-col gap-3">
          {exam.questions.map((q, i) => {
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
                    {q.context}
                  </p>
                )}
                <p className="text-sm font-medium leading-relaxed text-ink">
                  {q.statement}
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
                        <span className="flex-1">{opt}</span>
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
                    {explanation}
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
