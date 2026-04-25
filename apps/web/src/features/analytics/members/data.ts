import "server-only";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface MemberDTO {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface InvitationDTO {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  invitedAt: string;
  expiresAt: string;
  inviterName: string;
}

export interface MembersAndInvitationsDTO {
  members: MemberDTO[];
  invitations: InvitationDTO[];
}

/**
 * Retorna members ativos + invites pendentes da org. Devolve `null` quando
 * a sessão não tem org ativa (mesmo pattern do fetchOrgOverview) pra page
 * renderizar o fallback `NoActiveOrg` em vez de crashar.
 */
export async function fetchMembersAndInvitations(): Promise<MembersAndInvitationsDTO | null> {
  try {
    const res = await apiFetch<{ data: MembersAndInvitationsDTO }>(
      `/v1/analytics/members-and-invitations`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.code === "MISSING_ACTIVE_ORGANIZATION") {
      return null;
    }
    throw err;
  }
}
