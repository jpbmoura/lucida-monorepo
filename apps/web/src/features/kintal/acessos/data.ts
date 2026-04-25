"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  ListStaffResponse,
  PromoteStaffResponse,
  StaffActionResult,
  StaffMember,
} from "./types";

export async function fetchStaff(): Promise<StaffMember[]> {
  const data = await apiFetch<ListStaffResponse>("/api/kintal/staff");
  return data.staff;
}

export async function promoteStaffAction(
  email: string,
): Promise<StaffActionResult> {
  try {
    await apiFetch<PromoteStaffResponse>("/api/kintal/staff", {
      method: "POST",
      body: { email },
    });
    revalidatePath("/kintal/acessos");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function revokeStaffAction(
  userId: string,
): Promise<StaffActionResult> {
  try {
    await apiFetch<void>(`/api/kintal/staff/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    revalidatePath("/kintal/acessos");
    return { ok: true };
  } catch (err) {
    return toActionResult(err);
  }
}

function toActionResult(err: unknown): StaffActionResult {
  if (err instanceof ApiError) {
    const code = narrowCode(err.code);
    return { ok: false, code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente de novo em alguns segundos.",
  };
}

type ErrorCode = Extract<StaffActionResult, { ok: false }>["code"];

function narrowCode(raw: string): ErrorCode {
  switch (raw) {
    case "USER_NOT_FOUND":
    case "ALREADY_STAFF":
    case "CANNOT_REVOKE_SELF":
    case "VALIDATION_ERROR":
      return raw;
    default:
      return "UNKNOWN";
  }
}
