import "server-only";
import { apiFetch } from "@/lib/api-client";
import type { GeneratedQuestion } from "./types";

export interface ExamDetailDTO {
  id: string;
  classId: string;
  title: string;
  description: string;
  style: "simple" | "contextual" | "analytical" | "reflective";
  duration: number;
  shareId: string;
  questions: GeneratedQuestion[];
  usage: { inputTokens: number; outputTokens: number; credits: number } | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchExam(id: string): Promise<ExamDetailDTO> {
  const res = await apiFetch<{ data: ExamDetailDTO }>(
    `/v1/exams/${encodeURIComponent(id)}`,
  );
  return res.data;
}

export type SubmissionEndReason =
  | "submitted"
  | "time_expired"
  | "violation"
  | "abandoned";

export interface IntegrityFlags {
  tabSwitches: number;
  focusLosses: number;
  copyAttempts: number;
  rightClickAttempts: number;
  violationCount: number;
}

export type SubmissionSource = "online" | "scanner";

export type GradingStatus =
  | "not_required"
  | "pending"
  | "partially_graded"
  | "graded";

interface RawSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  score: number;
  correctCount: number;
  questionCount: number;
  submittedAt: string;
  source: SubmissionSource;
  endReason: SubmissionEndReason;
  integrityFlags: IntegrityFlags;
  gradingStatus: GradingStatus;
  hasAiDraft: boolean;
}

export interface ExamSubmissionsResult {
  items: RawSubmission[];
  stats: {
    total: number;
    average: number;
    highest: number | null;
    lowest: number | null;
    passRate: number | null;
    inProgress: number;
  };
}

export async function fetchSubmissionsByExam(
  examId: string,
): Promise<ExamSubmissionsResult> {
  const res = await apiFetch<{ data: ExamSubmissionsResult }>(
    `/v1/exams/${encodeURIComponent(examId)}/submissions`,
  );
  return res.data;
}

// ───── Correção de discursivas ───────────────────────────────

export interface RubricLevelDTO {
  id: string;
  label: string;
  points: number;
  descriptor: string;
}

export interface RubricCriterionDTO {
  id: string;
  name: string;
  description?: string | null;
  levels: RubricLevelDTO[];
}

export interface RubricDTO {
  criteria: RubricCriterionDTO[];
}

export interface OpenGradeCriterionDTO {
  criterionId: string;
  levelId: string;
  points: number;
  justification: string;
  feedback: string;
}

export interface OpenGradeViewDTO {
  criteria: OpenGradeCriterionDTO[];
  earned: number;
  max: number;
  overriddenFraction: number | null;
  fraction: number;
  source: "manual" | "ai";
  status: "ai_suggested" | "approved";
}

export interface OpenQuestionForGradingDTO {
  questionIndex: number;
  statement: string;
  context: string | null;
  referenceAnswer: string | null;
  rubric: RubricDTO;
  studentAnswer: string | null;
  grade: OpenGradeViewDTO | null;
}

export interface SubmissionForGradingDTO {
  submissionId: string;
  examId: string;
  studentName: string;
  studentCode: string;
  score: number;
  correctCount: number;
  questionCount: number;
  gradingStatus: GradingStatus;
  openQuestions: OpenQuestionForGradingDTO[];
}

export async function fetchSubmissionForGrading(
  examId: string,
  submissionId: string,
): Promise<SubmissionForGradingDTO> {
  const res = await apiFetch<{ data: SubmissionForGradingDTO }>(
    `/v1/exams/${encodeURIComponent(examId)}/submissions/${encodeURIComponent(
      submissionId,
    )}/grading`,
  );
  return res.data;
}

// Quantas submissões do professor têm discursivas aguardando correção.
// Best-effort: falha vira 0 (não quebra o dashboard).
export async function fetchPendingCorrectionsCount(): Promise<number> {
  try {
    const res = await apiFetch<{ data: { count: number } }>(
      "/v1/grading/pending-count",
    );
    return res.data.count;
  } catch {
    return 0;
  }
}

// ───── Fila de correção (tela "Corrigir Provas") ─────────────

export interface QueueSubmission {
  submissionId: string;
  studentName: string;
  studentCode: string;
  score: number;
  submittedAt: string;
  gradingStatus: GradingStatus;
  hasAiDraft: boolean;
}

export interface QueueExam {
  examId: string;
  examTitle: string;
  pendingCount: number;
  aiDraftCount: number;
  submissions: QueueSubmission[];
}

export interface QueueClass {
  classId: string;
  className: string;
  pendingCount: number;
  exams: QueueExam[];
}

export interface QueueCourse {
  /** null = provas sem curso ("Sem curso"). */
  courseId: string | null;
  courseName: string;
  pendingCount: number;
  classes: QueueClass[];
}

export interface GradingQueueDTO {
  totalSubmissions: number;
  totalExams: number;
  courses: QueueCourse[];
}

export async function fetchGradingQueue(): Promise<GradingQueueDTO> {
  const res = await apiFetch<{ data: GradingQueueDTO }>("/v1/grading/queue");
  return res.data;
}

export type ScanReviewStatus =
  | "auto_approved"
  | "pending"
  | "approved"
  | "rejected";

export interface ScanItemDTO {
  id: string;
  studentCode: string;
  studentName: string | null;
  studentCodeValid: boolean;
  score: number;
  correctCount: number;
  questionCount: number;
  requiresReview: boolean;
  reviewReasons: string[];
  reviewStatus: ScanReviewStatus;
  multiMarkedQuestions: number[];
  unmarkedQuestions: number[];
  scannedAt: string;
}

export async function fetchScansByExam(examId: string): Promise<ScanItemDTO[]> {
  const res = await apiFetch<{ data: ScanItemDTO[] }>(
    `/v1/exams/${encodeURIComponent(examId)}/scans`,
  );
  return res.data;
}
