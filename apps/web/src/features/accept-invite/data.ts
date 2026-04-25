import "server-only";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface InvitationInfoDTO {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "canceled" | "rejected";
  expiresAt: string;
  organizationName: string;
  inviterName: string;
}

/**
 * Busca info pública do convite pelo id. `null` quando o convite não existe
 * ou o id é malformado — a page trata ambos como "convite inválido" (sem
 * distinguir pra não vazar existência).
 */
export async function fetchInvitationInfo(
  invitationId: string,
): Promise<InvitationInfoDTO | null> {
  try {
    const res = await apiFetch<{ data: InvitationInfoDTO }>(
      `/v1/analytics/invitation-info/${encodeURIComponent(invitationId)}`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
