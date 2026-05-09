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

/**
 * Filtro de assinatura na listagem.
 *  - "any"      → sem filtro
 *  - "without"  → users sem assinatura ativa (active|past_due)
 *  - "active"|"past_due"|"canceled"|"paused" → match exato no status
 *
 * Não há mais opção "with" genérica; pra ver "qualquer assinatura ativa"
 * use `"active"` (cobre o caso comum) ou combine queries pelo lado do
 * cliente. Caso de "past_due" é rico o suficiente pra ter filtro próprio.
 */
export type ListSubscriptionFilter =
  | "any"
  | "without"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export interface ListKintalUsersFilter {
  /** Search livre — bate em name/email (case-insensitive, regex segura). */
  q?: string;
  /** Filtro de assinatura (status específico ou ausência). */
  subscription?: ListSubscriptionFilter;
  /** Filtro por role: "user" (sem role) | "staff" | "any". */
  role?: "any" | "user" | "staff";
  /** Filtra por `createdAt: { $gte: createdAfter }` — useful pra "novos". */
  createdAfter?: Date;
  /** Página 1-indexada. Default 1. */
  page?: number;
  /** Tamanho da página. Default 50, max 200. */
  pageSize?: number;
}

export interface ListKintalUsersResult {
  items: KintalUserListItem[];
  /** Total de matches no DB (após todos os filtros aplicados). */
  total: number;
  /** True quando há mais resultados além desta página. */
  hasMore: boolean;
}

/**
 * Read repository do Kintal pra área de Usuários. Atravessa três stores
 * (user BA, subscriptions, credit_wallets) e devolve já agregado pra evitar
 * N+1 nos consumidores.
 */
export interface KintalUsersRepository {
  list(filter: ListKintalUsersFilter): Promise<ListKintalUsersResult>;
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
