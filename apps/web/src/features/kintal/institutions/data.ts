"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  AdjustOrgCreditsActionResult,
  ArchivedFilter,
  CreateInstitutionActionResult,
  GetKintalInstitutionResponse,
  InstitutionActionResult,
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
  ownerPassword: string;
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
