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
  /**
   * Dados fiscais da org (PJ). Todos opcionais — quando vazios, a UI de
   * /analytics/configuracoes pede pra preencher antes que o billing
   * institucional ative. Estrutura espelha os campos do User pra
   * permitir reuso do mesmo `IssueInvoiceUseCase` independente de quem
   * é o tomador.
   */
  taxId: string | null;
  legalName: string | null;
  municipalRegistration: string | null;
  addressPostalCode: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCityCode: string | null;
  addressCityName: string | null;
  addressStateUf: string | null;
  addressCountry: string | null;
}

export interface UserMembership {
  organizationId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
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
  /**
   * Lista todas as orgs em que o user é member. Ordenado por `joinedAt`
   * ascendente. Vazio se não pertence a nenhuma. Usado pelo impersonate
   * de staff pra herdar org ativa do alvo.
   */
  listMembershipsByUser(userId: string): Promise<UserMembership[]>;
}
