"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api-client";

const questionSchema = z.object({
  type: z.enum(["multipleChoice", "trueFalse"]),
  statement: z.string().min(3),
  context: z.string().nullable(),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().int().nonnegative(),
  explanation: z.string(),
  difficulty: z.enum(["fácil", "médio", "difícil"]),
});

const usageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    credits: z.number().int().nonnegative(),
  })
  .nullable();

const createExamSchema = z.object({
  classId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  duration: z.number().int().min(0).max(600).optional(),
  securityLevel: z.enum(["off", "strict"]).optional(),
  questions: z.array(questionSchema).min(1),
  usage: usageSchema,
});

const updateExamSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(500).optional(),
  duration: z.number().int().min(0).max(600).optional(),
  securityLevel: z.enum(["off", "strict"]).optional(),
  questions: z.array(questionSchema).min(1).optional(),
});

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function toError(err: unknown): ActionResult["error"] {
  if (err instanceof ApiError) return { code: err.code, message: err.message };
  if (err instanceof z.ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: err.issues[0]?.message ?? "Entrada inválida",
    };
  }
  return { code: "UNKNOWN", message: "Erro inesperado." };
}

export async function createExamAction(
  input: unknown,
): Promise<ActionResult<{ id: string; shareId: string }>> {
  try {
    const body = createExamSchema.parse(input);
    const response = await apiFetch<{ data: { id: string; shareId: string } }>(
      "/v1/exams",
      { method: "POST", body },
    );
    revalidatePath(`/app/turmas/${body.classId}`);
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function updateExamAction(
  examId: string,
  classId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const body = updateExamSchema.parse(input);
    await apiFetch(`/v1/exams/${encodeURIComponent(examId)}`, {
      method: "PUT",
      body,
    });
    revalidatePath(`/app/provas/${examId}`);
    revalidatePath(`/app/turmas/${classId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function deleteExamAction(
  examId: string,
  classId: string,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/exams/${encodeURIComponent(examId)}`, { method: "DELETE" });
    revalidatePath(`/app/turmas/${classId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

// ───── Scanner (OMR) ─────────────────────────────────────────

const scanSheetSchema = z.object({
  imageBase64: z.string().min(100),
});

interface ScanSheetResult {
  scanId: string;
  outcome: "auto_approved" | "needs_review";
  studentCode: string;
  studentName: string | null;
  score: number;
  correctCount: number;
  questionCount: number;
  requiresReview: boolean;
  reviewReasons: string[];
}

export async function scanSheetAction(
  examId: string,
  input: unknown,
): Promise<ActionResult<ScanSheetResult>> {
  try {
    const body = scanSheetSchema.parse(input);
    const response = await apiFetch<{ data: ScanSheetResult }>(
      `/v1/exams/${encodeURIComponent(examId)}/scan`,
      { method: "POST", body },
    );
    revalidatePath(`/app/provas/${examId}`);
    revalidatePath(`/app/provas/${examId}/scanner`);
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function approveScanAction(
  scanId: string,
  examId: string,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/scans/${encodeURIComponent(scanId)}/approve`, {
      method: "POST",
    });
    revalidatePath(`/app/provas/${examId}`);
    revalidatePath(`/app/provas/${examId}/scanner`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function deleteScanAction(
  scanId: string,
  examId: string,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/scans/${encodeURIComponent(scanId)}`, {
      method: "DELETE",
    });
    revalidatePath(`/app/provas/${examId}`);
    revalidatePath(`/app/provas/${examId}/scanner`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}
