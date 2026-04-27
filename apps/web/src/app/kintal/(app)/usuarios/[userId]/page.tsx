import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchKintalUser } from "@/features/kintal/users/data";
import { UserDetailHeader } from "@/features/kintal/users/sections/user-detail-header";
import { EngagementGrid } from "@/features/kintal/users/sections/engagement-grid";
import { RevenuePanel } from "@/features/kintal/users/sections/revenue-panel";
import { CreditsPanel } from "@/features/kintal/users/sections/credits-panel";
import { LedgerList } from "@/features/kintal/users/sections/ledger-list";
import { SubscriptionsHistory } from "@/features/kintal/users/sections/subscriptions-history";
import { OrganizationsList } from "@/features/kintal/users/sections/organizations-list";
import { ProfileEditor } from "@/features/kintal/users/sections/profile-editor";
import { UserMeta } from "@/features/kintal/users/sections/user-meta";

export const metadata: Metadata = {
  title: "Detalhes do usuário",
};

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function KintalUserDetailPage({ params }: PageProps) {
  const { userId } = await params;

  let user;
  try {
    user = await fetchKintalUser(decodeURIComponent(userId));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <UserDetailHeader user={user} />

      <div className="mt-10 flex flex-col gap-6">
        <EngagementGrid data={user.engagement} />
        <RevenuePanel data={user.billing} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <CreditsPanel user={user} />
          <LedgerList entries={user.recentLedger} />
          <SubscriptionsHistory items={user.billing.subscriptionsHistory} />
          <OrganizationsList organizations={user.organizations} />
          <ProfileEditor user={user} />
        </div>
        <UserMeta user={user} />
      </div>
    </div>
  );
}
