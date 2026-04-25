import "server-only";
import { apiFetch } from "@/lib/api-client";
import type { TurmaDTO, AlunoDTO, TurmaExamDTO } from "./types";

interface RawTurma {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
  studentsCount: number;
  examsCount: number;
  activeExamsCount: number;
}

interface RawAluno {
  id: string;
  code: string;
  name: string;
  matricula: string;
  email: string | null;
  createdAt: string;
}

export async function fetchTurmas(): Promise<TurmaDTO[]> {
  const res = await apiFetch<{ data: RawTurma[] }>("/v1/classes");
  return res.data;
}

export async function fetchTurma(id: string): Promise<TurmaDTO> {
  const res = await apiFetch<{ data: RawTurma }>(`/v1/classes/${encodeURIComponent(id)}`);
  return res.data;
}

export async function fetchAlunosByTurma(classId: string): Promise<AlunoDTO[]> {
  const res = await apiFetch<{ data: RawAluno[] }>(
    `/v1/classes/${encodeURIComponent(classId)}/students`,
  );
  return res.data;
}

interface RawExam {
  id: string;
  title: string;
  style: "simple" | "contextual" | "analytical" | "reflective";
  questionCount: number;
  duration: number;
  securityLevel: "off" | "strict";
  shareId: string;
  submissionsCount: number;
  averageScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchExamsByTurma(classId: string): Promise<TurmaExamDTO[]> {
  const res = await apiFetch<{ data: RawExam[] }>(
    `/v1/classes/${encodeURIComponent(classId)}/exams`,
  );
  return res.data.map((e) => ({
    id: e.id,
    title: e.title,
    questionCount: e.questionCount,
    duration: e.duration,
    securityLevel: e.securityLevel,
    shareId: e.shareId,
    submissionsCount: e.submissionsCount,
    averageScore: e.averageScore,
    createdAt: e.createdAt,
  }));
}
