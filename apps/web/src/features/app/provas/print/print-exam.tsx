"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import type { ExamDetailDTO } from "../data";

export type ExamExportVersion = "student" | "answer_key" | "both";

interface PrintExamProps {
  exam: ExamDetailDTO;
  version: ExamExportVersion;
}

export function PrintExam({ exam, version }: PrintExamProps) {
  const showStudent = version === "student" || version === "both";
  const showKey = version === "answer_key" || version === "both";

  return (
    <>
      <div className="print-toolbar">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-ink">{exam.title}</span>
          <span className="mx-2 text-gray-400">·</span>
          <span>{versionLabel(version)}</span>
          <span className="mx-2 text-gray-400">·</span>
          <span className="text-xs">
            Use Ctrl+P (Cmd+P) → &ldquo;Salvar como PDF&rdquo;
          </span>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Imprimir
        </Button>
      </div>

      <article className="print-page">
        {showStudent && <StudentVersion exam={exam} />}
        {version === "both" && <div className="page-break" />}
        {showKey && <AnswerKey exam={exam} />}
      </article>
    </>
  );
}

function StudentVersion({ exam }: { exam: ExamDetailDTO }) {
  return (
    <section>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {exam.title}
        </h1>
        {exam.description && (
          <p className="mt-1 text-sm italic text-gray-600">{exam.description}</p>
        )}
      </header>

      <div className="mb-6 space-y-2 text-sm text-ink">
        <BlankField label="Nome" width="18rem" />
        <BlankField label="Turma" width="10rem" />
        <BlankField label="Data" width="8rem" />
        {exam.duration > 0 && (
          <p className="text-xs italic text-gray-600">
            Duração: {exam.duration} minutos
          </p>
        )}
      </div>

      <ol className="flex flex-col gap-5">
        {exam.questions.map((q, i) => (
          <li key={i} className="break-inside-avoid">
            {q.context && (
              <p className="mb-2 text-sm italic leading-relaxed text-gray-700">
                <RichText text={q.context} />
              </p>
            )}
            <p className="mb-2 text-sm leading-relaxed text-ink">
              <span className="font-semibold">{i + 1}.</span>{" "}
              <RichText text={q.statement} />
            </p>
            <ul className="ml-6 flex flex-col gap-1.5 text-sm text-ink">
              {q.options.map((opt, j) => (
                <li key={j}>
                  <span className="mr-1 font-semibold">
                    {String.fromCharCode(65 + j)})
                  </span>
                  <RichText text={opt} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AnswerKey({ exam }: { exam: ExamDetailDTO }) {
  return (
    <section>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-ink">
          Gabarito
        </h1>
        <p className="mt-1 text-sm italic text-gray-600">{exam.title}</p>
      </header>

      <ol className="flex flex-col gap-4">
        {exam.questions.map((q, i) => {
          const letter = String.fromCharCode(65 + q.correctAnswer);
          const correctOption = q.options[q.correctAnswer] ?? "";
          return (
            <li key={i} className="break-inside-avoid">
              <p className="text-sm leading-relaxed text-ink">
                <span className="font-semibold">{i + 1}.</span>{" "}
                <span className="font-semibold">
                  Resposta: {letter}) <RichText text={correctOption} />
                </span>
              </p>
              {q.explanation && (
                <p className="ml-5 mt-1 text-xs italic leading-relaxed text-gray-700">
                  <RichText text={q.explanation} />
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function BlankField({ label, width }: { label: string; width: string }) {
  return (
    <p>
      <span className="font-semibold">{label}:</span>{" "}
      <span
        className="inline-block border-b border-gray-400 align-bottom"
        style={{ width, height: "1em" }}
      />
    </p>
  );
}

function versionLabel(v: ExamExportVersion): string {
  if (v === "answer_key") return "Gabarito";
  if (v === "both") return "Enunciado + Gabarito";
  return "Versão do aluno";
}
