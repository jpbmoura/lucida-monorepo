import type { Metadata } from "next";
import {
  fetchBalance,
  fetchInvoices,
  fetchLedger,
  fetchCurrentSubscription,
} from "@/features/app/billing/data";
import {
  fetchActiveOrganization,
  getInstitutionalBillingContext,
} from "@/lib/active-organization";
import { BillingPage } from "@/features/app/billing/billing-page";

export const metadata: Metadata = {
  title: "Créditos e plano",
};

interface PageProps {
  searchParams: Promise<{ checkout?: string }>;
}

export default async function BillingRoute({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [balance, ledger, subscription, invoices, activeOrg] =
    await Promise.all([
      fetchBalance().catch(() => ({ total: 0, breakdown: [] })),
      fetchLedger(50).catch(() => []),
      fetchCurrentSubscription().catch(() => null),
      fetchInvoices().catch(() => []),
      fetchActiveOrganization().catch(() => null),
    ]);

  const institutionalContext = getInstitutionalBillingContext(
    activeOrg?.name ?? null,
    activeOrg?.billingMode ?? null,
  );

  return (
    <BillingPage
      balance={balance}
      ledger={ledger}
      subscription={subscription}
      invoices={invoices}
      checkoutSuccess={sp.checkout === "success"}
      institutionalContext={institutionalContext}
      billingMode={activeOrg?.billingMode ?? null}
    />
  );
}
