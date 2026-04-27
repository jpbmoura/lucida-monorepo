export type SubscriptionFilter = "any" | "with" | "without";
export type RoleFilter = "any" | "user" | "staff";

export interface KintalUserListItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  whatsapp: string | null;
  institutionType: string | null;
  stateUf: string | null;
  createdAt: string;
  creditBalance: number;
  subscription: { planId: string; status: string } | null;
}

export interface KintalEngagementSummary {
  classesCount: number;
  studentsCount: number;
  examsCount: number;
  submissionsCount: number;
  averageStudentScore: number | null;
  totalCreditsConsumed: number;
  lastActivityAt: string | null;
}

export interface KintalSubscriptionHistoryItem {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
}

export interface KintalBillingSummary {
  lifetimeRevenueCents: number;
  lifetimeSubscriptionRevenueCents: number;
  lifetimeTopupsCount: number;
  lifetimeTopupsRevenueCents: number;
  currentSubscription: KintalSubscriptionHistoryItem | null;
  subscriptionsHistory: KintalSubscriptionHistoryItem[];
}

export interface KintalLedgerEntry {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  walletSource: string;
  relatedAction: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export interface KintalUserOrgMembership {
  id: string;
  name: string;
  slug: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface KintalUserDetail {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  emailVerified: boolean;
  banned: boolean | null;
  whatsapp: string | null;
  institutionType: string | null;
  stateUf: string | null;
  studentsRange: string | null;
  teachingYears: string | null;
  acquisitionChannel: string | null;
  gender: string | null;
  teachingLevels: string[];
  subjects: string[];
  staffSince: string | null;
  legacyClerkId: string | null;
  needsEmailUpdate: boolean | null;
  createdAt: string;
  updatedAt: string | null;
  creditBalance: number;
  walletBreakdown: Array<{
    source: string;
    balance: number;
    expiresAt: string | null;
  }>;
  subscription: { planId: string; status: string } | null;
  engagement: KintalEngagementSummary;
  billing: KintalBillingSummary;
  recentLedger: KintalLedgerEntry[];
  organizations: KintalUserOrgMembership[];
}

export interface ListKintalUsersResponse {
  users: KintalUserListItem[];
}

export interface GetKintalUserResponse {
  user: KintalUserDetail;
}

export type KintalUsersActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type AdjustCreditsActionResult =
  | { ok: true; newBalance: number; delta: number }
  | { ok: false; code: string; message: string };

export const SUBSCRIPTION_FILTERS: { value: SubscriptionFilter; label: string }[] = [
  { value: "any", label: "Todos" },
  { value: "with", label: "Com assinatura" },
  { value: "without", label: "Sem assinatura" },
];

export const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "any", label: "Todos" },
  { value: "user", label: "Usuários" },
  { value: "staff", label: "Staff" },
];

export function isSubscriptionFilter(v: string): v is SubscriptionFilter {
  return v === "any" || v === "with" || v === "without";
}

export function isRoleFilter(v: string): v is RoleFilter {
  return v === "any" || v === "user" || v === "staff";
}

export const PLAN_LABELS: Record<string, string> = {
  basic_monthly: "Básico mensal",
  basic_yearly: "Básico anual",
  pro_monthly: "Pro mensal",
  pro_yearly: "Pro anual",
};

export const SOURCE_LABELS: Record<string, string> = {
  subscription: "Assinatura",
  topup: "Topup",
  welcome: "Boas-vindas",
  promo: "Promoção",
  admin_grant: "Ajuste manual",
};

export const REASON_LABELS: Record<string, string> = {
  welcome_bonus: "Bônus de boas-vindas",
  subscription_renewal: "Renovação da assinatura",
  topup_purchase: "Compra de pacote",
  promo_grant: "Crédito promocional",
  ai_consumption: "Consumo de IA",
  expiration: "Expiração",
  refund: "Estorno",
  adjustment: "Ajuste manual",
  admin_grant: "Crédito manual",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  past_due: "Pagamento em atraso",
  canceled: "Cancelada",
  paused: "Pausada",
};

export const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Professor",
};
