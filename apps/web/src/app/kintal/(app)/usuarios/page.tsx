import type { Metadata } from "next";
import { fetchKintalUsers } from "@/features/kintal/users/data";
import {
  isRoleFilter,
  isSubscriptionFilter,
  type RoleFilter,
  type SubscriptionFilter,
} from "@/features/kintal/users/types";
import { UsuariosPageHeader } from "@/features/kintal/users/sections/page-header";
import { UsersFilters } from "@/features/kintal/users/components/users-filters";
import { UsersList } from "@/features/kintal/users/sections/users-list";

export const metadata: Metadata = {
  title: "Usuários",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    subscription?: string;
    role?: string;
  }>;
}

export default async function KintalUsuariosPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const subscription: SubscriptionFilter =
    sp.subscription && isSubscriptionFilter(sp.subscription)
      ? sp.subscription
      : "any";
  const role: RoleFilter =
    sp.role && isRoleFilter(sp.role) ? sp.role : "any";

  const users = await fetchKintalUsers({ q, subscription, role });

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <UsuariosPageHeader total={users.length} />

      <div className="mt-8">
        <UsersFilters q={q} subscription={subscription} role={role} />
      </div>

      <div className="mt-8">
        <UsersList users={users} />
      </div>
    </div>
  );
}
