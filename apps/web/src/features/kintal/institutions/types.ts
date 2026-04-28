export type OrgBillingMode =
  | "pool"
  | "per_teacher"
  | "pay_per_use"
  | "unlimited";

export type ArchivedFilter = "active" | "all" | "archived";

export interface KintalInstitutionListItem {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
  archivedAt: string | null;
  billingMode: OrgBillingMode | null;
  creditBalance: number;
  owner: { id: string; name: string | null; email: string } | null;
  membersCount: number;
}

export interface KintalInstitutionMember {
  id: string;
  name: string | null;
  email: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface KintalInstitutionUsage {
  windowFrom: string;
  windowTo: string;
  creditsConsumed: number;
  examsGenerated: number;
  lifetimeCreditsConsumed: number;
}

export interface KintalInstitutionWalletBreakdown {
  walletId: string;
  source: string;
  balance: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface KintalInstitutionLedgerEntry {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  walletSource: string;
  actorUserId: string | null;
  relatedAction: string | null;
  createdAt: string;
}

export interface KintalInstitutionDetail extends KintalInstitutionListItem {
  perTeacherLimit: number | null;
  stripeSubscriptionId: string | null;
  members: KintalInstitutionMember[];
  walletBreakdown: KintalInstitutionWalletBreakdown[];
  recentLedger: KintalInstitutionLedgerEntry[];
  usage: KintalInstitutionUsage;
}

export type ListKintalInstitutionsResponse = {
  institutions: KintalInstitutionListItem[];
};

export type GetKintalInstitutionResponse = {
  institution: KintalInstitutionDetail;
};

export type InstitutionActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type CreateInstitutionActionResult =
  | { ok: true; organizationId: string; ownerUserId: string }
  | { ok: false; code: string; message: string };

export type AdjustOrgCreditsActionResult =
  | { ok: true; delta: number }
  | { ok: false; code: string; message: string };
