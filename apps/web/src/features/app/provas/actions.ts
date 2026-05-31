"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api-client";

const difficultyEnum = z.enum(["fácil", "médio", "difícil"]);

const rubricSchema = z.object({
  criteria: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        levels: z
          .array(
            z.object({
              id: z.string().min(1),
              label: z.string().min(1),
              points: z.number().nonnegative(),
              descriptor: z.string().optional().default(""),
            }),
          )
          .min(2),
      }),
    )
    .min(1),
});

const objectiveBase = {
  statement: z.string().min(3),
  context: z.string().nullable(),
  correctAnswer: z.number().int().nonnegative(),
  explanation: z.string(),
  difficulty: difficultyEnum,
};

const questionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("multipleChoice"),
    options: z.array(z.string()).min(2).max(6),
    ...objectiveBase,
  }),
  z.object({
    type: z.literal("trueFalse"),
    options: z.array(z.string()).length(2),
    ...objectiveBase,
  }),
  z.object({
    type: z.literal("open"),
    statement: z.string().min(3),
    context: z.string().nullable(),
    explanation: z.string(),
    difficulty: difficultyEnum,
    rubric: rubricSchema,
    referenceAnswer: z.string().nullable().optional(),
  }),
]);

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

const copyExamSchema = z.object({ targetClassId: z.string().min(1) });

export async function copyExamToClassAction(
  sourceExamId: string,
  targetClassId: string,
): Promise<ActionResult<{ id: string; shareId: string }>> {
  try {
    const body = copyExamSchema.parse({ targetClassId });
    const response = await apiFetch<{ data: { id: string; shareId: string } }>(
      `/v1/exams/${encodeURIComponent(sourceExamId)}/copy`,
      { method: "POST", body },
    );
    revalidatePath(`/app/turmas/${targetClassId}`);
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

// ───── Correção manual de discursivas ───────────────────────

const gradeOpenAnswersSchema = z.object({
  grades: z
    .array(
      z.object({
        questionIndex: z.number().int().nonnegative(),
        criteria: z.array(
          z.object({
            criterionId: z.string().min(1),
            levelId: z.string().min(1),
            justification: z.string().optional(),
            feedback: z.string().optional(),
          }),
        ),
        overrideFraction: z.number().min(0).max(1).nullable().optional(),
      }),
    )
    .min(1),
});

export async function gradeOpenAnswersAction(
  examId: string,
  submissionId: string,
  input: unknown,
): Promise<ActionResult<{ score: number; gradingStatus: string }>> {
  try {
    const body = gradeOpenAnswersSchema.parse(input);
    const response = await apiFetch<{
      data: { score: number; gradingStatus: string };
    }>(
      `/v1/exams/${encodeURIComponent(examId)}/submissions/${encodeURIComponent(
        submissionId,
      )}/grade-open`,
      { method: "POST", body },
    );
    revalidatePath(`/app/provas/${examId}`);
    revalidatePath(`/app/provas/${examId}/corrigir/${submissionId}`);
    return { ok: true, data: response.data };
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
