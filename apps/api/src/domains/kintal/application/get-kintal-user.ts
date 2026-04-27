import type { KintalUsersRepository } from "./ports/kintal-users-repository.js";
import { KintalUserNotFoundError } from "../domain/users-errors.js";

interface Input {
  userId: string;
}

export interface KintalEngagementDTO {
  classesCount: number;
  studentsCount: number;
  examsCount: number;
  submissionsCount: number;
  averageStudentScore: number | null;
  totalCreditsConsumed: number;
  lastActivityAt: string | null;
}

export interface KintalSubscriptionHistoryDTO {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
}

export interface KintalBillingDTO {
  lifetimeRevenueCents: number;
  lifetimeSubscriptionRevenueCents: number;
  lifetimeTopupsCount: number;
  lifetimeTopupsRevenueCents: number;
  currentSubscription: KintalSubscriptionHistoryDTO | null;
  subscriptionsHistory: KintalSubscriptionHistoryDTO[];
}

export interface KintalRecentLedgerDTO {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  walletSource: string;
  relatedAction: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export interface KintalOrgInfoDTO {
  id: string;
  name: string;
  slug: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface KintalUserDetailDTO {
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
  engagement: KintalEngagementDTO;
  billing: KintalBillingDTO;
  recentLedger: KintalRecentLedgerDTO[];
  organizations: KintalOrgInfoDTO[];
}

export class GetKintalUserUseCase {
  constructor(private readonly users: KintalUsersRepository) {}

  async execute(input: Input): Promise<KintalUserDetailDTO> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new KintalUserNotFoundError();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified,
      banned: user.banned,
      whatsapp: user.whatsapp,
      institutionType: user.institutionType,
      stateUf: user.stateUf,
      studentsRange: user.studentsRange,
      teachingYears: user.teachingYears,
      acquisitionChannel: user.acquisitionChannel,
      gender: user.gender,
      teachingLevels: user.teachingLevels,
      subjects: user.subjects,
      staffSince: user.staffSince?.toISOString() ?? null,
      legacyClerkId: user.legacyClerkId,
      needsEmailUpdate: user.needsEmailUpdate,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt?.toISOString() ?? null,
      creditBalance: user.creditBalance,
      walletBreakdown: user.walletBreakdown.map((w) => ({
        source: w.source,
        balance: w.balance,
        expiresAt: w.expiresAt?.toISOString() ?? null,
      })),
      subscription: user.subscription,
      engagement: {
        classesCount: user.engagement.classesCount,
        studentsCount: user.engagement.studentsCount,
        examsCount: user.engagement.examsCount,
        submissionsCount: user.engagement.submissionsCount,
        averageStudentScore: user.engagement.averageStudentScore,
        totalCreditsConsumed: user.engagement.totalCreditsConsumed,
        lastActivityAt: user.engagement.lastActivityAt?.toISOString() ?? null,
      },
      billing: {
        lifetimeRevenueCents: user.billing.lifetimeRevenueCents,
        lifetimeSubscriptionRevenueCents:
          user.billing.lifetimeSubscriptionRevenueCents,
        lifetimeTopupsCount: user.billing.lifetimeTopupsCount,
        lifetimeTopupsRevenueCents: user.billing.lifetimeTopupsRevenueCents,
        currentSubscription: user.billing.currentSubscription
          ? toSubHistoryDTO(user.billing.currentSubscription)
          : null,
        subscriptionsHistory:
          user.billing.subscriptionsHistory.map(toSubHistoryDTO),
      },
      recentLedger: user.recentLedger.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        reason: e.reason,
        walletSource: e.walletSource,
        relatedAction: e.relatedAction,
        tokensUsed: e.tokensUsed,
        createdAt: e.createdAt.toISOString(),
      })),
      organizations: user.organizations.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        role: o.role,
        joinedAt: o.joinedAt.toISOString(),
      })),
    };
  }
}

function toSubHistoryDTO(s: {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  createdAt: Date;
}): KintalSubscriptionHistoryDTO {
  return {
    id: s.id,
    planId: s.planId,
    status: s.status,
    currentPeriodStart: s.currentPeriodStart.toISOString(),
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    canceledAt: s.canceledAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}
