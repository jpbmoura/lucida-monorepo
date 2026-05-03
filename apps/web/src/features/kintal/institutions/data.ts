"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  AddMemberActionResult,
  AdjustOrgCreditsActionResult,
  ArchivedFilter,
  CreateInstitutionActionResult,
  GetKintalInstitutionResponse,
  InstitutionActionResult,
  InstitutionRole,
  KintalInstitutionDetail,
  KintalInstitutionListItem,
  ListKintalInstitutionsResponse,
  OrgBillingMode,
} from "./types";

interface ListFilters {
  q?: string;
  archived?: ArchivedFilter;
  limit?: number;
}

/**
 * Lista resumida de orgs ativas — usada pelos pickers (ex: dialog de
 * vincular user à instituição na tela de user).
 */
export async function fetchInstitutionsForPicker(
  q?: string,
): Promise<Array<{ id: string; name: string; slug: string | null }>> {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  sp.set("limit", "30");
  const data = await apiFetch<ListKintalInstitutionsResponse>(
    `/api/kintal/institutions?${sp.toString()}`,
  );
  return data.institutions.map((i) => ({
    id: i.id,
    name: i.name,
    slug: i.slug,
  }));
}

export async function fetchInstitutions(
  filters: ListFilters,
): Promise<KintalInstitutionListItem[]> {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);
  if (filters.archived && filters.archived !== "active") {
    sp.set("archived", filters.archived);
  }
  if (filters.limit) sp.set("limit", String(filters.limit));

  const qs = sp.toString();
  const data = await apiFetch<ListKintalInstitutionsResponse>(
    `/api/kintal/institutions${qs ? `?${qs}` : ""}`,
  );
  return data.institutions;
}

export async function fetchInstitution(
  orgId: string,
): Promise<KintalInstitutionDetail> {
  const data = await apiFetch<GetKintalInstitutionResponse>(
    `/api/kintal/institutions/${encodeURIComponent(orgId)}`,
  );
  return data.institution;
}

export interface CreateInstitutionPayload {
  ownerEmail: string;
  ownerName: string;
  /**
   * Opcional — só usada se o email **não existir** ainda. Se o user já
   * tem cadastro, o backend reusa e ignora a senha.
   */
  ownerPassword?: string;
  orgName: string;
  orgSlug: string;
  billingMode: OrgBillingMode;
}

export async function createInstitutionAction(
  payload: CreateInstitutionPayload,
): Promise<CreateInstitutionActionResult> {
  try {
    const res = await apiFetch<{
      organizationId: string;
      ownerUserId: string;
      ownerExisted: boolean;
    }>("/api/kintal/institutions", {
      method: "POST",
      body: payload,
    });
    revalidatePath("/kintal/instituicoes");
    return { ok: true, ...res };
  } catch (err) {
    return toAction(err) as CreateInstitutionActionResult;
  }
}

export interface AddMemberByEmailPayload {
  userEmail: string;
  userName?: string;
  password?: string;
  role: InstitutionRole;
}

export async function addInstitutionMemberAction(
  orgId: string,
  payload: AddMemberByEmailPayload,
): Promise<AddMemberActionResult> {
  try {
    const res = await apiFetch<{ userId: string; userExisted: boolean }>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/members`,
      { method: "POST", body: payload },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
    return { ok: true, ...res };
  } catch (err) {
    return toAction(err) as AddMemberActionResult;
  }
}

export async function removeInstitutionMemberAction(
  orgId: string,
  userId: string,
): Promise<InstitutionActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
    return { ok: true };
  } catch (err) {
    return toAction(err);
  }
}

/**
 * Linkar/desvincular pela tela do USER. Reusa os mesmos endpoints
 * por baixo, mas vive nas actions de institutions porque o use case
 * é o mesmo.
 */
export async function linkUserToInstitutionAction(
  userId: string,
  payload: { organizationId: string; role: InstitutionRole },
): Promise<InstitutionActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/users/${encodeURIComponent(userId)}/memberships`,
      { method: "POST", body: payload },
    );
    revalidatePath(`/kintal/usuarios/${userId}`);
    return { ok: true };
  } catch (err) {
    return toAction(err);
  }
}

export async function unlinkUserFromInstitutionAction(
  userId: string,
  orgId: string,
): Promise<InstitutionActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/users/${encodeURIComponent(userId)}/memberships/${encodeURIComponent(orgId)}`,
      { method: "DELETE" },
    );
    revalidatePath(`/kintal/usuarios/${userId}`);
    return { ok: true };
  } catch (err) {
    return toAction(err);
  }
}

export async function updateInstitutionBillingAction(
  orgId: string,
  billingMode: OrgBillingMode,
): Promise<InstitutionActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/billing`,
      { method: "PATCH", body: { billingMode } },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
    revalidatePath("/kintal/instituicoes");
    return { ok: true };
  } catch (err) {
    return toAction(err);
  }
}

export async function archiveInstitutionAction(
  orgId: string,
): Promise<InstitutionActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/archive`,
      { method: "POST" },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
    revalidatePath("/kintal/instituicoes");
    return { ok: true };
  } catch (err) {
    return toAction(err);
  }
}

export async function unarchiveInstitutionAction(
  orgId: string,
): Promise<InstitutionActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/unarchive`,
      { method: "POST" },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
    revalidatePath("/kintal/instituicoes");
    return { ok: true };
  } catch (err) {
    return toAction(err);
  }
}

export async function adjustOrgCreditsAction(
  orgId: string,
  amount: number,
  options?: { expiresInDays?: number | null; note?: string },
): Promise<AdjustOrgCreditsActionResult> {
  try {
    const res = await apiFetch<{ delta: number }>(
      `/api/kintal/institutions/${encodeURIComponent(orgId)}/credits`,
      {
        method: "POST",
        body: {
          amount,
          expiresInDays: options?.expiresInDays ?? null,
          note: options?.note,
        },
      },
    );
    revalidatePath(`/kintal/instituicoes/${orgId}`);
    revalidatePath("/kintal/instituicoes");
    return { ok: true, delta: res.delta };
  } catch (err) {
    return toAction(err) as AdjustOrgCreditsActionResult;
  }
}

function toAction(err: unknown): InstitutionActionResult {
  if (err instanceof ApiError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente novamente em alguns segundos.",
  };
}
