import type { Metadata } from "next";
import { fetchKintalUsers } from "@/features/kintal/users/data";
import {
  isCreatedWithinFilter,
  isRoleFilter,
  isSubscriptionFilter,
  type CreatedWithinFilter,
  type RoleFilter,
  type SubscriptionFilter,
} from "@/features/kintal/users/types";
import { UsuariosPageHeader } from "@/features/kintal/users/sections/page-header";
import { UsersFilters } from "@/features/kintal/users/components/users-filters";
import { UsersList } from "@/features/kintal/users/sections/users-list";

export const metadata: Metadata = {
  title: "Usuários",
};

const ALLOWED_PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    subscription?: string;
    role?: string;
    createdWithin?: string;
    page?: string;
    pageSize?: string;
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
  const createdWithin: CreatedWithinFilter =
    sp.createdWithin && isCreatedWithinFilter(sp.createdWithin)
      ? sp.createdWithin
      : "all";

  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  const data = await fetchKintalUsers({
    q,
    subscription,
    role,
    createdWithin,
    page,
    pageSize,
  });

  const baseHref = buildBaseHref({
    q,
    subscription,
    role,
    createdWithin,
    page: data.page,
    pageSize: data.pageSize,
  });

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <UsuariosPageHeader total={data.total} />

      <div className="mt-8">
        <UsersFilters
          q={q}
          subscription={subscription}
          role={role}
          createdWithin={createdWithin}
        />
      </div>

      <div className="mt-8">
        <UsersList
          users={data.users}
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          hasMore={data.hasMore}
          baseHref={baseHref}
        />
      </div>
    </div>
  );
}

function parsePage(raw: string | undefined): number {
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function parsePageSize(raw: string | undefined): number {
  if (!raw) return DEFAULT_PAGE_SIZE;
  const n = Number.parseInt(raw, 10);
  return (ALLOWED_PAGE_SIZES as readonly number[]).includes(n)
    ? n
    : DEFAULT_PAGE_SIZE;
}

/**
 * Reconstrói o querystring atual pra alimentar links de paginação no
 * `UsersList`. Inclui só params com valor não-default — UX limpa de URL.
 */
function buildBaseHref(input: {
  q: string;
  subscription: SubscriptionFilter;
  role: RoleFilter;
  createdWithin: CreatedWithinFilter;
  page: number;
  pageSize: number;
}): string {
  const sp = new URLSearchParams();
  if (input.q) sp.set("q", input.q);
  if (input.subscription !== "any") sp.set("subscription", input.subscription);
  if (input.role !== "any") sp.set("role", input.role);
  if (input.createdWithin !== "all")
    sp.set("createdWithin", input.createdWithin);
  if (input.page > 1) sp.set("page", String(input.page));
  if (input.pageSize !== DEFAULT_PAGE_SIZE)
    sp.set("pageSize", String(input.pageSize));
  const qs = sp.toString();
  return qs ? `/kintal/usuarios?${qs}` : "/kintal/usuarios";
}
