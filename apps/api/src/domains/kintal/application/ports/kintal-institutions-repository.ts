import type { OrgBillingMode } from "@/domains/billing/domain/billing-mode.js";

export interface KintalInstitutionListItem {
  id: string;
  name: string;
  slug: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  billingMode: OrgBillingMode | null;
  /** Saldo de créditos da org (scope=org, ativos). 0 em modo unlimited. */
  creditBalance: number;
  /** Quem é o owner — null se a org foi criada sem owner válido. */
  owner: { id: string; name: string | null; email: string } | null;
  membersCount: number;
}

export interface KintalInstitutionMember {
  id: string;
  name: string | null;
  email: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

export interface KintalInstitutionUsage {
  /** Janela em que `creditsConsumed` e `examsGenerated` são medidos. */
  windowFrom: Date;
  windowTo: Date;
  /** Soma de débitos `ai_consumption` no scope=org dentro da janela. */
  creditsConsumed: number;
  /** Provas criadas por members da org dentro da janela. */
  examsGenerated: number;
  /** Soma vitalícia de débitos ai_consumption no scope=org. */
  lifetimeCreditsConsumed: number;
}

export interface KintalInstitutionWalletBreakdown {
  walletId: string;
  source: string;
  balance: number;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface KintalInstitutionLedgerEntry {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  walletSource: string;
  actorUserId: string | null;
  relatedAction: string | null;
  createdAt: Date;
}

export interface KintalInstitutionDetail extends KintalInstitutionListItem {
  perTeacherLimit: number | null;
  stripeSubscriptionId: string | null;
  members: KintalInstitutionMember[];
  walletBreakdown: KintalInstitutionWalletBreakdown[];
  recentLedger: KintalInstitutionLedgerEntry[];
  usage: KintalInstitutionUsage;
}

export interface ListKintalInstitutionsFilter {
  q?: string;
  /** Default só ativas; "all" inclui arquivadas; "archived" só arquivadas. */
  archived?: "active" | "all" | "archived";
  limit?: number;
  before?: Date;
}

export interface CreateInstitutionInput {
  ownerEmail: string;
  /** Ignorado quando o user já existe (apenas reusa). */
  ownerName: string;
  /** Obrigatório só se o email **não existir** ainda. Validado no use case. */
  ownerPassword?: string;
  orgName: string;
  /** Slug em kebab — único na collection `organization`. */
  orgSlug: string;
  billingMode: OrgBillingMode;
}

export interface CreateInstitutionResult {
  organizationId: string;
  ownerUserId: string;
  /** true se reusou um user já existente; false se criou um novo. */
  ownerExisted: boolean;
}

export type InstitutionRole = "admin" | "member";

export interface AddInstitutionMemberInput {
  organizationId: string;
  userEmail: string;
  /** Usado só se o user não existir; ignorado caso contrário. */
  userName?: string;
  /** Usado só se o user não existir; ignorado caso contrário. */
  password?: string;
  role: InstitutionRole;
}

export interface AddInstitutionMemberByUserIdInput {
  organizationId: string;
  userId: string;
  role: InstitutionRole;
}

export interface AddInstitutionMemberResult {
  userId: string;
  /** true se reusou um user existente; false se criou um novo. */
  userExisted: boolean;
}

export interface RemoveInstitutionMemberInput {
  organizationId: string;
  userId: string;
}

/**
 * Read + write das instituições no Kintal. Acessa três stores:
 *   - BetterAuth (`organization`, `member`, `user`) via auth db.
 *   - Mongoose (`wallets`, `ledger_entries`, `organization_billing_settings`).
 *
 * Implementação fica em infrastructure; o use case só conhece esta interface.
 */
export interface KintalInstitutionsRepository {
  list(
    filter: ListKintalInstitutionsFilter,
  ): Promise<KintalInstitutionListItem[]>;
  findById(orgId: string): Promise<KintalInstitutionDetail | null>;
  /**
   * Cria org + membership + billing settings, reusando ou criando o user
   * owner conforme o email já exista. Lança:
   * - `InstitutionSlugTakenError` quando o slug colide.
   * - `OwnerAlreadyInOrganizationError` quando o email pertence a um
   *   user que já é membro de outra instituição.
   * - `InvalidInstitutionInputError` quando email novo precisa de senha
   *   e ela não foi passada.
   *
   * NÃO é uma transação Mongo — em caso de falha intermediária, o
   * caller deve esperar uma org parcialmente criada.
   */
  create(input: CreateInstitutionInput): Promise<CreateInstitutionResult>;
  /**
   * Adiciona um user à instituição via email — pode criar o user se ele
   * não existir (precisa `userName` + `password`). Recusa se o user já
   * for membro de qualquer org (regra "1 user = 1 org"). Não envia email
   * de convite — o vínculo é direto.
   */
  addMember(input: AddInstitutionMemberInput): Promise<AddInstitutionMemberResult>;
  /**
   * Adiciona um user já existente à instituição — usado quando staff
   * resolve o user pela tela do user (não cria user novo).
   */
  addMemberByUserId(
    input: AddInstitutionMemberByUserIdInput,
  ): Promise<void>;
  /** Remove o vínculo do user com a org. Não permite remover owner. */
  removeMember(input: RemoveInstitutionMemberInput): Promise<void>;
  /** Soft-delete: seta `archivedAt = now()` na collection organization. */
  archive(orgId: string): Promise<void>;
  /** Limpa `archivedAt`. */
  unarchive(orgId: string): Promise<void>;
  /**
   * Confirma que a org existe (não checa archived). Usado por endpoints que
   * precisam fazer follow-up sem carregar o detalhe inteiro.
   */
  exists(orgId: string): Promise<boolean>;
}
