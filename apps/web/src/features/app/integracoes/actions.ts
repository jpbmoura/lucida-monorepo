"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { ImportResultDTO, ReconciliationReportDTO } from "./types";

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function toResult<T = undefined>(err: unknown): ActionResult<T> {
  if (err instanceof ApiError) {
    return { ok: false, error: { code: err.code, message: err.message } };
  }
  if (err instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues[0]?.message ?? "Entrada inválida",
      },
    };
  }
  return { ok: false, error: { code: "UNKNOWN", message: "Erro inesperado." } };
}

/**
 * Pega a URL de consentimento do Google. O client redireciona o browser
 * (window.location.href) — o OAuth roda fora do app e volta no callback.
 */
export async function connectClassroomAction(): Promise<ActionResult<{ url: string }>> {
  try {
    const res = await apiFetch<{ data: { url: string } }>(
      "/v1/integrations/classroom/oauth/authorize-url",
    );
    return { ok: true, data: res.data };
  } catch (err) {
    return toResult<{ url: string }>(err);
  }
}

export async function disconnectClassroomAction(): Promise<ActionResult> {
  try {
    await apiFetch("/v1/integrations/classroom/disconnect", { method: "POST" });
    revalidatePath("/app/integracoes");
    revalidatePath("/app/integracoes/classroom");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

const importSchema = z
  .object({
    className: z.string().min(2).max(120),
    courseId: z.string().min(1).optional(),
    newCourseName: z.string().min(2).max(120).optional(),
  })
  .refine((v) => Boolean(v.courseId) !== Boolean(v.newCourseName), {
    message: "Escolha um curso existente ou crie um novo.",
  });

export async function importClassroomCourseAction(
  classroomCourseId: string,
  input: unknown,
): Promise<ActionResult<ImportResultDTO>> {
  try {
    const body = importSchema.parse(input);
    const res = await apiFetch<{ data: ImportResultDTO }>(
      `/v1/integrations/classroom/courses/${encodeURIComponent(classroomCourseId)}/import`,
      { method: "POST", body },
    );
    revalidatePath("/app/integracoes/classroom");
    revalidatePath("/app/turmas");
    revalidatePath("/app/cursos");
    return { ok: true, data: res.data };
  } catch (err) {
    return toResult<ImportResultDTO>(err);
  }
}

export async function reconcileClassroomAction(
  classId: string,
): Promise<ActionResult<ReconciliationReportDTO>> {
  try {
    const res = await apiFetch<{ data: ReconciliationReportDTO }>(
      `/v1/integrations/classroom/classes/${encodeURIComponent(classId)}/reconcile`,
      { method: "POST" },
    );
    revalidatePath("/app/integracoes/classroom");
    return { ok: true, data: res.data };
  } catch (err) {
    return toResult<ReconciliationReportDTO>(err);
  }
}
