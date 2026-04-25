"use client";

import { useState } from "react";
import { CodeEntry } from "./components/code-entry";
import { ExamTaking } from "./components/exam-taking";
import { ResultScreen } from "./components/result-screen";
import { AlreadySubmitted } from "./components/already-submitted";
import type {
  BeginExamResponse,
  ExamSession,
  IntegrityFlags,
  PreviousSubmissionDTO,
  PublicExamDTO,
  SubmissionEndReason,
  SubmitExamResponse,
} from "./types";

type Step = "entry" | "taking" | "result" | "alreadySubmitted";

interface PublicExamProps {
  exam: PublicExamDTO;
}

interface SubmitPayload {
  answers: Array<number | null>;
  endReason: SubmissionEndReason;
  integrityFlags: IntegrityFlags;
}

export function PublicExam({ exam }: PublicExamProps) {
  const [step, setStep] = useState<Step>("entry");
  const [studentName, setStudentName] = useState<string>("");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [previousSubmission, setPreviousSubmission] =
    useState<PreviousSubmissionDTO | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [result, setResult] = useState<SubmitExamResponse | null>(null);

  async function handleCodeSubmit(code: string) {
    const res = await fetch(
      `/v1/public/exams/${encodeURIComponent(exam.shareId)}/begin`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentCode: code }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? "Não foi possível validar o código.");
    }
    const { data } = (await res.json()) as { data: BeginExamResponse };
    setStudentName(data.student.name);
    if (data.status === "already_submitted") {
      setPreviousSubmission(data.previousSubmission);
      setStep("alreadySubmitted");
      return;
    }
    setSession({
      submissionId: data.submissionId,
      startedAt: data.startedAt,
      deadline: data.deadline,
    });
    setStep("taking");
  }

  async function handleSubmitAnswers(payload: SubmitPayload) {
    if (!session) throw new Error("Sessão não encontrada.");
    const res = await fetch(
      `/v1/public/exams/${encodeURIComponent(exam.shareId)}/submissions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submissionId: session.submissionId,
          answers: payload.answers,
          endReason: payload.endReason,
          integrityFlags: payload.integrityFlags,
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? "Não foi possível enviar a prova.");
    }
    const { data } = (await res.json()) as { data: SubmitExamResponse };
    setAnswers(payload.answers);
    setResult(data);
    setStep("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (step === "entry") {
    return (
      <CodeEntry
        examTitle={exam.title}
        examDescription={exam.description}
        questionCount={exam.questions.length}
        duration={exam.duration}
        securityLevel={exam.securityLevel}
        onSubmit={handleCodeSubmit}
      />
    );
  }

  if (step === "alreadySubmitted" && previousSubmission) {
    return (
      <AlreadySubmitted
        examTitle={exam.title}
        studentName={studentName}
        submission={previousSubmission}
      />
    );
  }

  if (step === "taking" && session) {
    return (
      <ExamTaking
        exam={exam}
        studentName={studentName}
        session={session}
        onSubmit={handleSubmitAnswers}
      />
    );
  }

  if (step === "result" && result) {
    return (
      <ResultScreen
        exam={exam}
        studentName={studentName}
        answers={answers}
        result={result}
      />
    );
  }

  return null;
}
