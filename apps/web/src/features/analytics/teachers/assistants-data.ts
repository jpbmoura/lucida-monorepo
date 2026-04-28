"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface TeacherAssistantDTO {
  id: string;
  teacherUserId: string;
  assistantUserId: string;
  assistantName: string | null;
  assistantEmail: string;
  organizationId: string;
  createdAt: string;
  createdBy: string;
}

export type AssistantsActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type CreateAssistantActionResult =
  | { ok: true; assistantUserId: string; linkId: string }
  | { ok: false; code: string; message: string };

interface ListResponse {
  assistants: TeacherAssistantDTO[];
}

export async function fetchTeacherAssistants(
  teacherId: string,
): Promise<TeacherAssistantDTO[]> {
  const res = await apiFetch<ListResponse>(
    `/v1/analytics/teachers/${encodeURIComponent(teacherId)}/assistants`,
  );
  return res.assistants;
}

export async function createAssistantAction(
  teacherId: string,
  payload: { name: string; email: string; password: string },
): Promise<CreateAssistantActionResult> {
  try {
    const res = await apiFetch<{ assistantUserId: string; linkId: string }>(
      `/v1/analytics/teachers/${encodeURIComponent(teacherId)}/assistants`,
      { method: "POST", body: payload },
    );
    revalidatePath(`/analytics/professores/${teacherId}`);
    return { ok: true, ...res };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Erro inesperado ao criar auxiliar.",
    };
  }
}

export async function revokeAssistantAction(
  teacherId: string,
  linkId: string,
): Promise<AssistantsActionResult> {
  try {
    await apiFetch<void>(
      `/v1/analytics/assistants/${encodeURIComponent(linkId)}`,
      { method: "DELETE" },
    );
    revalidatePath(`/analytics/professores/${teacherId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Erro inesperado ao revogar.",
    };
  }
}
