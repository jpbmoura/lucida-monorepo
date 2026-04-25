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
