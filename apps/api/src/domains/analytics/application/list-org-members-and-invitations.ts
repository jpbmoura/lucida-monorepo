import type { OrganizationMembersRepository } from "./ports/organization-members-repository.js";
import type { OrganizationInvitationsRepository } from "./ports/organization-invitations-repository.js";

interface Input {
  organizationId: string;
}

export interface MembersAndInvitationsResponse {
  members: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: "owner" | "admin" | "member";
    joinedAt: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: "owner" | "admin" | "member";
    invitedAt: string;
    expiresAt: string;
    inviterName: string;
  }>;
}

/**
 * Composição simples: members via BA org plugin + invitations pendentes no
 * mesmo formato. Usado pela página /analytics/professores. Agregar numa
 * única chamada evita cascata de fetches no server component.
 */
export class ListOrgMembersAndInvitationsUseCase {
  constructor(
    private readonly members: OrganizationMembersRepository,
    private readonly invitations: OrganizationInvitationsRepository,
  ) {}

  async execute(input: Input): Promise<MembersAndInvitationsResponse> {
    const [members, invitations] = await Promise.all([
      this.members.listMembers(input.organizationId),
      this.invitations.listPending(input.organizationId),
    ]);

    return {
      members: members
        .slice()
        .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name))
        .map((m) => ({
          id: m.userId,
          name: m.name,
          email: m.email,
          image: m.image,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        invitedAt: i.invitedAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        inviterName: i.inviterName,
      })),
    };
  }
}

function roleRank(role: "owner" | "admin" | "member"): number {
  if (role === "owner") return 0;
  if (role === "admin") return 1;
  return 2;
}
