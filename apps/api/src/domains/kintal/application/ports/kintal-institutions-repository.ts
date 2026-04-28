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
  ownerName: string;
  ownerPassword: string;
  orgName: string;
  /** Slug em kebab — único na collection `organization`. */
  orgSlug: string;
  billingMode: OrgBillingMode;
}

export interface CreateInstitutionResult {
  organizationId: string;
  ownerUserId: string;
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
   * Cria user + org + membership + billing settings em sequência.
   * Lança `InstitutionSlugTakenError` ou `InstitutionOwnerEmailTakenError`
   * quando aplicável. NÃO é uma transação Mongo — em caso de falha
   * intermediária, o caller deve esperar uma org parcialmente criada.
   * (Mongo MVP, troca por session.withTransaction quando os 3 docs precisarem
   * de garantia transacional.)
   */
  create(input: CreateInstitutionInput): Promise<CreateInstitutionResult>;
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
