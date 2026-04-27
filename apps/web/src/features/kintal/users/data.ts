"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  AdjustCreditsActionResult,
  GetKintalUserResponse,
  KintalUserDetail,
  KintalUserListItem,
  KintalUsersActionResult,
  ListKintalUsersResponse,
  RoleFilter,
  SubscriptionFilter,
} from "./types";

interface ListKintalUsersFilters {
  q?: string;
  subscription?: SubscriptionFilter;
  role?: RoleFilter;
  limit?: number;
}

export async function fetchKintalUsers(
  filters: ListKintalUsersFilters,
): Promise<KintalUserListItem[]> {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);
  if (filters.subscription && filters.subscription !== "any") {
    sp.set("subscription", filters.subscription);
  }
  if (filters.role && filters.role !== "any") sp.set("role", filters.role);
  if (filters.limit) sp.set("limit", String(filters.limit));

  const qs = sp.toString();
  const data = await apiFetch<ListKintalUsersResponse>(
    `/api/kintal/users${qs ? `?${qs}` : ""}`,
  );
  return data.users;
}

export async function fetchKintalUser(
  userId: string,
): Promise<KintalUserDetail> {
  const data = await apiFetch<GetKintalUserResponse>(
    `/api/kintal/users/${encodeURIComponent(userId)}`,
  );
  return data.user;
}

export async function updateKintalUserAction(
  userId: string,
  patch: {
    name?: string;
    whatsapp?: string | null;
    institutionType?: string | null;
    stateUf?: string | null;
    studentsRange?: string | null;
    teachingYears?: string | null;
    acquisitionChannel?: string | null;
  },
): Promise<KintalUsersActionResult> {
  try {
    await apiFetch<void>(`/api/kintal/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: patch,
    });
    revalidatePath(`/kintal/usuarios/${userId}`);
    revalidatePath("/kintal/usuarios");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function adjustUserCreditsAction(
  userId: string,
  amount: number,
  note?: string,
): Promise<AdjustCreditsActionResult> {
  try {
    const result = await apiFetch<{ delta: number; newBalance: number }>(
      `/api/kintal/users/${encodeURIComponent(userId)}/credits`,
      {
        method: "POST",
        body: { amount, note },
      },
    );
    revalidatePath(`/kintal/usuarios/${userId}`);
    revalidatePath("/kintal/usuarios");
    return { ok: true, ...result };
  } catch (err) {
    const r = toActionResult(err);
    return r as AdjustCreditsActionResult;
  }
}

function toActionResult(err: unknown): KintalUsersActionResult {
  if (err instanceof ApiError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente novamente em alguns segundos.",
  };
}
