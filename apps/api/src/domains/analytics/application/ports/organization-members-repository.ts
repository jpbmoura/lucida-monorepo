// Port que isola o analytics do `organization` plugin do BetterAuth. O
// plugin guarda os dados no BA MongoDB (driver mongodb@7, collections
// `organization` e `member`) — não em modelos Mongoose. Expor via port
// mantém o use case de agregação agnóstico da fonte.

export interface OrgMember {
  /** Hex do ObjectId do user — usado como `ownerId` em exams/submissions. */
  userId: string;
  role: "owner" | "admin" | "member";
  name: string;
  email: string;
  image: string | null;
  joinedAt: Date;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationMembersRepository {
  listMembers(organizationId: string): Promise<OrgMember[]>;
  getOrganization(organizationId: string): Promise<OrgInfo | null>;
  /**
   * Retorna o role do user na organização dada. `null` quando o user não
   * é membro (ou algum id é inválido). Usado pra autorização no
   * /analytics: só owner/admin tem acesso.
   */
  findRole(
    organizationId: string,
    userId: string,
  ): Promise<"owner" | "admin" | "member" | null>;
}
