import "server-only";
import { apiFetch } from "@/lib/api-client";

export type CreditSource = "subscription" | "topup" | "welcome" | "promo";

export type LedgerType = "credit" | "debit";

export type LedgerReason =
  | "welcome_bonus"
  | "subscription_renewal"
  | "topup_purchase"
  | "promo_grant"
  | "ai_consumption"
  | "expiration"
  | "refund"
  | "adjustment";

export interface BalanceBreakdown {
  source: CreditSource;
  balance: number;
  expiresAt: string | null;
}

export interface BalanceDTO {
  total: number;
  breakdown: BalanceBreakdown[];
}

export interface LedgerItemDTO {
  id: string;
  walletSource: string;
  type: LedgerType;
  amount: number;
  reason: LedgerReason;
  relatedAction: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export async function fetchBalance(): Promise<BalanceDTO> {
  const res = await apiFetch<{ data: BalanceDTO }>("/v1/billing/balance");
  return res.data;
}

export async function fetchLedger(limit = 50): Promise<LedgerItemDTO[]> {
  const res = await apiFetch<{ data: LedgerItemDTO[] }>(
    `/v1/billing/ledger?limit=${limit}`,
  );
  return res.data;
}

// ───── subscriptions ────────────────────────────────────────

export type PlanId =
  | "basic_monthly"
  | "basic_yearly"
  | "pro_monthly"
  | "pro_yearly";

export interface CurrentSubscriptionDTO {
  planId: PlanId;
  planName: string;
  status: "active" | "past_due" | "canceled" | "paused";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export async function fetchCurrentSubscription(): Promise<CurrentSubscriptionDTO | null> {
  const res = await apiFetch<{ data: CurrentSubscriptionDTO | null }>(
    "/v1/billing/subscription",
  );
  return res.data;
}
