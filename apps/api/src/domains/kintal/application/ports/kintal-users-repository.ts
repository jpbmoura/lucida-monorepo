import type { CreditSource } from "@/domains/billing/domain/credit-source.js";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export interface KintalUserListItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  whatsapp: string | null;
  institutionType: string | null;
  stateUf: string | null;
  createdAt: Date;
  /** Soma de wallets ativas (não expiradas, balance > 0). */
  creditBalance: number;
  /** Resumo da assinatura ativa (active/past_due) — null se não tem. */
  subscription: { planId: string; status: SubscriptionStatus } | null;
}

export interface KintalUserEngagement {
  classesCount: number;
  studentsCount: number;
  examsCount: number;
  /** Submissões `submitted` recebidas pelas provas desse user. */
  submissionsCount: number;
  /** Média 0..10 (nullable se ainda não há submissões). */
  averageStudentScore: number | null;
  /** Soma de débitos `ai_consumption` ao longo da vida da conta. */
  totalCreditsConsumed: number;
  /** Max entre últimas datas (exam created, submission, ledger debit). */
  lastActivityAt: Date | null;
}

export interface KintalSubscriptionHistoryItem {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  createdAt: Date;
}

export interface KintalUserBilling {
  /** topups + subscriptions já pagos. */
  lifetimeRevenueCents: number;
  lifetimeSubscriptionRevenueCents: number;
  lifetimeTopupsCount: number;
  lifetimeTopupsRevenueCents: number;
  currentSubscription:
    | (KintalSubscriptionHistoryItem & { status: "active" | "past_due" })
    | null;
  subscriptionsHistory: KintalSubscriptionHistoryItem[];
}

export interface KintalRecentLedgerEntry {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  walletSource: string;
  relatedAction: string | null;
  tokensUsed: number | null;
  createdAt: Date;
}

export interface KintalUserOrgInfo {
  id: string;
  name: string;
  slug: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

export interface KintalUserDetail extends KintalUserListItem {
  emailVerified: boolean;
  banned: boolean | null;
  teachingLevels: string[];
  subjects: string[];
  acquisitionChannel: string | null;
  studentsRange: string | null;
  teachingYears: string | null;
  gender: string | null;
  staffSince: Date | null;
  legacyClerkId: string | null;
  needsEmailUpdate: boolean | null;
  updatedAt: Date | null;
  /** Detalhamento das wallets ativas (origem, saldo, expiração). */
  walletBreakdown: Array<{
    source: CreditSource;
    balance: number;
    expiresAt: Date | null;
  }>;
  engagement: KintalUserEngagement;
  billing: KintalUserBilling;
  recentLedger: KintalRecentLedgerEntry[];
  organizations: KintalUserOrgInfo[];
}

export interface ListKintalUsersFilter {
  /** Search livre — bate em name/email (case-insensitive, regex segura). */
  q?: string;
  /** "with"/"without" filtra por presença de assinatura ativa. */
  subscription?: "any" | "with" | "without";
  /** Filtro por role: "user" (sem role) | "staff" | "any". */
  role?: "any" | "user" | "staff";
  /** Limite de retorno. Default 50, max 200. */
  limit?: number;
  /** Cursor por createdAt (paginação simples). */
  before?: Date;
}

/**
 * Read repository do Kintal pra área de Usuários. Atravessa três stores
 * (user BA, subscriptions, credit_wallets) e devolve já agregado pra evitar
 * N+1 nos consumidores.
 */
export interface KintalUsersRepository {
  list(filter: ListKintalUsersFilter): Promise<KintalUserListItem[]>;
  findById(userId: string): Promise<KintalUserDetail | null>;

  /**
   * Atualiza campos editáveis do user (subset dos additionalFields da BA).
   * `null` em string fields = limpar; `undefined` = não tocar.
   */
  update(
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
  ): Promise<void>;
}
