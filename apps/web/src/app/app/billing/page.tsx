import type { Metadata } from "next";
import {
  fetchBalance,
  fetchLedger,
  fetchCurrentSubscription,
} from "@/features/app/billing/data";
import { BillingPage } from "@/features/app/billing/billing-page";

export const metadata: Metadata = {
  title: "Créditos e plano",
};

interface PageProps {
  searchParams: Promise<{ checkout?: string }>;
}

export default async function BillingRoute({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [balance, ledger, subscription] = await Promise.all([
    fetchBalance().catch(() => ({ total: 0, breakdown: [] })),
    fetchLedger(50).catch(() => []),
    fetchCurrentSubscription().catch(() => null),
  ]);

  return (
    <BillingPage
      balance={balance}
      ledger={ledger}
      subscription={subscription}
      checkoutSuccess={sp.checkout === "success"}
    />
  );
}
