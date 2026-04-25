export interface PublicQuestionDTO {
  type: "multipleChoice" | "trueFalse";
  statement: string;
  context: string | null;
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

export interface SubmitExamResponse {
  id: string;
  score: number;
  correctCount: number;
  questionCount: number;
  endReason: SubmissionEndReason;
  questionResults: Array<{ correctAnswer: number; explanation: string }>;
}
