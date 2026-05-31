"use client";

import { useState } from "react";
import { CodeEntry } from "./components/code-entry";
import { EmailEntry } from "./components/email-entry";
import { WelcomeScreen } from "./components/welcome-screen";
import { ExamTaking } from "./components/exam-taking";
import { ResultScreen } from "./components/result-screen";
import { AlreadySubmitted } from "./components/already-submitted";
import type {
  BeginExamResponse,
  ExamSession,
  IntegrityFlags,
  PreviousSubmissionDTO,
  PublicExamDTO,
  PublicResultDTO,
  ResultView,
  SubmissionEndReason,
  SubmitExamResponse,
} from "./types";

type Step =
  | "emailEntry"
  | "codeEntry"
  | "welcome"
  | "taking"
  | "result"
  | "alreadySubmitted";

interface PrefilledFromToken {
  token: string;
  studentName: string;
  /** Estado atual da submissão resolvido pelo server. Define a tela
   * inicial: not_started → welcome; in_progress → welcome (que recupera
   * sessão); submitted → alreadySubmitted (sem precisar bater na API). */
  submission:
    | { status: "not_started" }
    | { status: "in_progress"; submissionId: string }
    | {
        status: "submitted";
        submissionId: string;
        score: number;
        questionCount: number;
        submittedAt: string;
      };
}

interface PublicExamProps {
  exam: PublicExamDTO;
  /**
   * Quando presente, o aluno chegou via link assinado (matrícula
   * resolvida pela instituição). Pula o `CodeEntry` — vai direto pra
   * tela de boas-vindas com nome em destaque. Submissão é criada via
   * `begin-from-token` em vez de `begin`.
   */
  prefilledFromToken?: PrefilledFromToken;
}

interface SubmitPayload {
  answers: Array<number | null>;
  textAnswers: Array<string | null>;
  endReason: SubmissionEndReason;
  integrityFlags: IntegrityFlags;
}

export function PublicExam({ exam, prefilledFromToken }: PublicExamProps) {
  const initialStep: Step = prefilledFromToken
    ? prefilledFromToken.submission.status === "submitted"
      ? "alreadySubmitted"
      : "welcome"
    : "emailEntry";

  const [step, setStep] = useState<Step>(initialStep);
  const [studentName, setStudentName] = useState<string>(
    prefilledFromToken?.studentName ?? "",
  );
  const [session, setSession] = useState<ExamSession | null>(null);
  const [previousSubmission, setPreviousSubmission] =
    useState<PreviousSubmissionDTO | null>(
      prefilledFromToken?.submission.status === "submitted"
        ? {
            id: prefilledFromToken.submission.submissionId,
            score: prefilledFromToken.submission.score,
            // Sem correctCount no preview — UI tolera 0 quando ainda
            // não rebuscou via begin-from-token.
            correctCount: 0,
            questionCount: prefilledFromToken.submission.questionCount,
            submittedAt: prefilledFromToken.submission.submittedAt,
          }
        : null,
    );
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [textAnswers, setTextAnswers] = useState<Array<string | null>>([]);
  const [result, setResult] = useState<ResultView | null>(null);

  async function handleCodeSubmit(code: string) {
    const data = await runBegin({
      shareId: exam.shareId,
      payload: { studentCode: code },
    });
    applyBeginResponse(data);
  }

  async function handleEmailSubmit(input: { email: string; name: string }) {
    const data = await runBegin({
      shareId: exam.shareId,
      payload: input,
      mode: "byEmail",
    });
    applyBeginResponse(data);
  }

  async function handleTokenStart() {
    if (!prefilledFromToken) return;
    const data = await runBegin({
      shareId: exam.shareId,
      payload: { token: prefilledFromToken.token },
      fromToken: true,
    });
    applyBeginResponse(data);
  }

  function applyBeginResponse(data: BeginExamResponse) {
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
          textAnswers: payload.textAnswers,
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
    setTextAnswers(payload.textAnswers);
    setResult(data);
    setStep("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Revisita: busca o resultado completo (inclui a correção das discursivas,
  // se já feita) e mostra a tela de resultado.
  async function handleViewResult(submissionId: string) {
    const res = await fetch(
      `/v1/public/exams/${encodeURIComponent(exam.shareId)}/result/${encodeURIComponent(
        submissionId,
      )}`,
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? "Não foi possível carregar o resultado.");
    }
    const { data } = (await res.json()) as { data: PublicResultDTO };
    setAnswers(data.answers);
    setTextAnswers(data.textAnswers);
    setResult(data);
    setStep("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (step === "emailEntry") {
    return (
      <EmailEntry
        examTitle={exam.title}
        examDescription={exam.description}
        questionCount={exam.questions.length}
        duration={exam.duration}
        securityLevel={exam.securityLevel}
        onSubmit={handleEmailSubmit}
        onSwitchToCode={() => setStep("codeEntry")}
      />
    );
  }

  if (step === "codeEntry") {
    return (
      <CodeEntry
        examTitle={exam.title}
        examDescription={exam.description}
        questionCount={exam.questions.length}
        duration={exam.duration}
        securityLevel={exam.securityLevel}
        onSubmit={handleCodeSubmit}
        onBack={() => setStep("emailEntry")}
      />
    );
  }

  if (step === "welcome") {
    return (
      <WelcomeScreen
        examTitle={exam.title}
        examDescription={exam.description}
        questionCount={exam.questions.length}
        duration={exam.duration}
        securityLevel={exam.securityLevel}
        studentName={studentName}
        onStart={handleTokenStart}
      />
    );
  }

  if (step === "alreadySubmitted" && previousSubmission) {
    return (
      <AlreadySubmitted
        examTitle={exam.title}
        studentName={studentName}
        submission={previousSubmission}
        onViewResult={() => handleViewResult(previousSubmission.id)}
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
        textAnswers={textAnswers}
        result={result}
      />
    );
  }

  return null;
}

/**
 * Wrapper sobre `fetch` pro POST de begin (com ou sem token). Tira o
 * boilerplate do componente e centraliza tratamento de erro.
 */
async function runBegin({
  shareId,
  payload,
  fromToken,
  mode,
}: {
  shareId: string;
  payload: Record<string, unknown>;
  fromToken?: boolean;
  mode?: "byEmail";
}): Promise<BeginExamResponse> {
  const suffix =
    mode === "byEmail"
      ? "/begin-by-email"
      : fromToken
        ? "/begin-from-token"
        : "/begin";
  const path = `/v1/public/exams/${encodeURIComponent(shareId)}${suffix}`;
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.message ?? "Não foi possível iniciar a prova. Tente novamente.",
    );
  }
  const { data } = (await res.json()) as { data: BeginExamResponse };
  return data;
}
