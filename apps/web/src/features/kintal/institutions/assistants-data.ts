"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface KintalMemberAssistantDTO {
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
  assistants: KintalMemberAssistantDTO[];
}

/**
 * Lê os auxiliares ativos de um professor da instituição via Kintal. Não usa
 * cache do Next — a lista é re-buscada toda vez que o dialog do membro abre,
 * pra evitar mostrar dados velhos depois de criar/revogar.
 */
export async function fetchMemberAssistants(
  orgId: string,
  teacherId: string,
): Promise<KintalMemberAssistantDTO[]> {
  const res = await apiFetch<ListResponse>(
    `/api/kintal/institutions/${encodeURIComponent(orgId)}/teachers/${encodeURIComponent(teacherId)}/assistants`,
  );
  return res.assistants;
}

export async function createMemberAssistantAction(
  orgId: string,
  teacherId: string,
  payload: { name: string; email: string; password: string },
): Promise<CreateAssistantActionResult> {
  try {
    const res = await apiFetch<{ assistantUserId: string; linkId: string }>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/teachers/${encodeURIComponent(teacherId)}/assistants`,
      { method: "POST", body: payload },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
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

export async function revokeMemberAssistantAction(
  orgId: string,
  linkId: string,
): Promise<AssistantsActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/assistants/${encodeURIComponent(linkId)}`,
      { method: "DELETE" },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
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
