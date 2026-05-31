export type QuestionType = "multipleChoice" | "trueFalse" | "open";

export type GradingStatus =
  | "not_required"
  | "pending"
  | "partially_graded"
  | "graded";

export interface PublicQuestionDTO {
  type: QuestionType;
  statement: string;
  context: string | null;
  // Discursiva (`open`) vem com options vazio; o aluno responde em texto.
  options: string[];
}

export interface PublicExamDTO {
  id: string;
  shareId: string;
  classId: string;
  title: string;
  description: string;
  duration: number;
  securityLevel: "off" | "strict";
  questions: PublicQuestionDTO[];
}

export interface PreviousSubmissionDTO {
  id: string;
  score: number;
  correctCount: number;
  questionCount: number;
  submittedAt: string;
}

export interface StudentDTO {
  id: string;
  name: string;
  code: string;
}

export type BeginExamResponse =
  | {
      status: "started";
      submissionId: string;
      student: StudentDTO;
      startedAt: string;
      deadline: number | null;
      remainingSeconds: number | null;
    }
  | {
      status: "already_submitted";
      student: StudentDTO;
      previousSubmission: PreviousSubmissionDTO;
    };

export type SubmissionEndReason =
  | "submitted"
  | "time_expired"
  | "violation";

export interface IntegrityFlags {
  tabSwitches: number;
  focusLosses: number;
  copyAttempts: number;
  rightClickAttempts: number;
  violationCount: number;
}

export interface ExamSession {
  submissionId: string;
  startedAt: string;
  deadline: number | null;
}

export interface GradedCriterionView {
  name: string;
  levelLabel: string;
  descriptor: string;
  points: number;
  maxPoints: number;
  feedback: string;
}

export interface OpenGradeView {
  earned: number;
  max: number;
  fraction: number;
  criteria: GradedCriterionView[];
}

export interface QuestionResultView {
  type: QuestionType;
  correctAnswer: number;
  explanation: string;
  /** Correção da discursiva — presente só após o professor corrigir. */
  grade?: OpenGradeView | null;
}

/** Resultado consumido pela ResultScreen (submit e revisita compartilham). */
export interface ResultView {
  score: number;
  correctCount: number;
  questionCount: number;
  /** "pending" quando há discursivas aguardando correção do professor. */
  gradingStatus: GradingStatus;
  questionResults: QuestionResultView[];
}

export interface SubmitExamResponse extends ResultView {
  id: string;
  endReason: SubmissionEndReason;
}

/** Resultado completo retornado ao revisitar o link (inclui respostas do aluno). */
export interface PublicResultDTO extends ResultView {
  id: string;
  answers: Array<number | null>;
  textAnswers: Array<string | null>;
}
