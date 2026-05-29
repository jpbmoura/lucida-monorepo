"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api-client";

const segmentSchema = z.enum([
  "FUNDAMENTAL",
  "MEDIO",
  "FACULDADE",
  "INFOPRODUTOR",
]);

const bnccSkillSchema = z.object({
  code: z.string(),
  description: z.string(),
});

const contentSchema = z.object({
  objectives: z.array(z.string()),
  bnccSkills: z.array(bnccSkillSchema),
  bnccVerified: z.boolean(),
  content: z.string(),
  methodology: z.string(),
  resources: z.array(z.string()),
  introduction: z.string(),
  development: z.string(),
  conclusion: z.string(),
  assessment: z.string(),
  bibliography: z.array(z.string()),
});

const identificationSchema = z.object({
  title: z.string().min(2).max(200),
  subject: z.string().max(120),
  level: z.string().max(120),
  durationMinutes: z.number().int().min(0).max(600),
  date: z.string().datetime().nullable().optional(),
});

const usageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    credits: z.number().int().nonnegative(),
  })
  .nullable();

const createSchema = z.object({
  classId: z.string().min(1),
  segment: segmentSchema,
  status: z.enum(["DRAFT", "READY", "ARCHIVED"]).optional(),
  identification: identificationSchema,
  content: contentSchema,
  usage: usageSchema.optional(),
});

const updateSchema = z.object({
  identification: identificationSchema.partial().optional(),
  content: contentSchema.optional(),
  status: z.enum(["DRAFT", "READY", "ARCHIVED"]).optional(),
  generatedExamId: z.string().min(1).optional(),
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

export async function createLessonPlanAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const body = createSchema.parse(input);
    const response = await apiFetch<{ data: { id: string } }>(
      "/v1/lesson-plans",
      { method: "POST", body },
    );
    revalidatePath(`/app/turmas/${body.classId}`);
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function updateLessonPlanAction(
  planId: string,
  classId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const body = updateSchema.parse(input);
    await apiFetch(`/v1/lesson-plans/${encodeURIComponent(planId)}`, {
      method: "PUT",
      body,
    });
    revalidatePath(`/app/aulas/${planId}`);
    revalidatePath(`/app/turmas/${classId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function duplicateLessonPlanAction(
  planId: string,
  classId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const response = await apiFetch<{ data: { id: string } }>(
      `/v1/lesson-plans/${encodeURIComponent(planId)}/duplicate`,
      { method: "POST" },
    );
    revalidatePath(`/app/turmas/${classId}`);
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function archiveLessonPlanAction(
  planId: string,
  classId: string,
  archived: boolean,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/lesson-plans/${encodeURIComponent(planId)}/archive`, {
      method: "POST",
      body: { archived },
    });
    revalidatePath(`/app/turmas/${classId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

// Handoff: grava no plano a prova gerada a partir dele (back-reference).
// Chamado pelo wizard de provas após salvar uma prova originada de um plano.
export async function linkExamToLessonPlanAction(
  planId: string,
  examId: string,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/lesson-plans/${encodeURIComponent(planId)}`, {
      method: "PUT",
      body: { generatedExamId: examId },
    });
    revalidatePath(`/app/aulas/${planId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function deleteLessonPlanAction(
  planId: string,
  classId: string,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/lesson-plans/${encodeURIComponent(planId)}`, {
      method: "DELETE",
    });
    revalidatePath(`/app/turmas/${classId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}
