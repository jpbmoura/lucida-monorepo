import { Building2, Crown, Shield, User } from "lucide-react";
import {
  ROLE_LABELS,
  type KintalUserOrgMembership,
} from "../types";

interface OrganizationsListProps {
  organizations: KintalUserOrgMembership[];
}

export function OrganizationsList({ organizations }: OrganizationsListProps) {
  if (organizations.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-7">
        <h2 className="text-base font-medium tracking-tight text-ink">
          Organizações
        </h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Esse user é uma conta individual — não pertence a nenhuma instituição.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-baseline justify-between border-b border-gray-100 px-7 py-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Membro de{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              instituições
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {organizations.length}{" "}
            {organizations.length === 1 ? "organização" : "organizações"} —
            ordenadas por papel.
          </p>
        </div>
      </header>
      <ul>
        {organizations.map((org, i) => (
          <li
            key={org.id}
            className={
              i < organizations.length - 1
                ? "border-b border-gray-50"
                : undefined
            }
          >
            <OrgRow org={org} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrgRow({ org }: { org: KintalUserOrgMembership }) {
  const RoleIcon =
    org.role === "owner" ? Crown : org.role === "admin" ? Shield : User;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-7 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500">
        <Building2 className="size-4" />
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {org.name}
          </span>
          {org.slug && (
            <code className="shrink-0 text-[10px] text-gray-400">
              {org.slug}
            </code>
          )}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          desde{" "}
          {new Date(org.joinedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          })}
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-pill bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600">
        <RoleIcon className="size-3" />
        {ROLE_LABELS[org.role] ?? org.role}
      </span>
    </div>
  );
}
