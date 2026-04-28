import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchInstitution } from "@/features/kintal/institutions/data";
import { ApiError } from "@/lib/api-client";
import { InstitutionDetailHeader } from "@/features/kintal/institutions/sections/detail-header";
import { BillingPanel } from "@/features/kintal/institutions/sections/billing-panel";
import { MembersPanel } from "@/features/kintal/institutions/sections/members-panel";
import { UsagePanel } from "@/features/kintal/institutions/sections/usage-panel";
import { LedgerPanel } from "@/features/kintal/institutions/sections/ledger-panel";
import { DangerZone } from "@/features/kintal/institutions/sections/danger-zone";

export const metadata: Metadata = {
  title: "Detalhes da instituição",
};

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function KintalInstituicaoDetailPage({
  params,
}: PageProps) {
  const { orgId } = await params;

  let institution;
  try {
    institution = await fetchInstitution(orgId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 pb-24 md:px-10">
      <InstitutionDetailHeader institution={institution} />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <BillingPanel institution={institution} />
          <UsagePanel institution={institution} />
          <LedgerPanel entries={institution.recentLedger} />
        </div>
        <div className="flex flex-col gap-6">
          <MembersPanel members={institution.members} />
          <DangerZone institution={institution} />
        </div>
      </div>
    </div>
  );
}
