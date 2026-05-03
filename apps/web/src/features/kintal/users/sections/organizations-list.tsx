"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Crown,
  Link2Off,
  Loader2,
  Plus,
  Shield,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { unlinkUserFromInstitutionAction } from "@/features/kintal/institutions/data";
import { LinkInstitutionDialog } from "../components/link-institution-dialog";
import { ROLE_LABELS, type KintalUserOrgMembership } from "../types";

interface OrganizationsListProps {
  userId: string;
  organizations: KintalUserOrgMembership[];
}

export function OrganizationsList({
  userId,
  organizations,
}: OrganizationsListProps) {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlink(org: KintalUserOrgMembership) {
    if (org.role === "owner") return;
    if (!window.confirm(`Desvincular este usuário de ${org.name}?`)) return;
    setError(null);
    setUnlinkingId(org.id);
    const res = await unlinkUserFromInstitutionAction(userId, org.id);
    setUnlinkingId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  if (organizations.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-7">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-base font-medium tracking-tight text-ink">
              Organizações
            </h2>
            <p className="mt-1 text-[13px] text-gray-500">
              Esse user é uma conta individual — não pertence a nenhuma
              instituição.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLinkOpen(true)}
          >
            <Plus className="size-3.5" />
            Vincular
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        <LinkInstitutionDialog
          userId={userId}
          open={linkOpen}
          onOpenChange={setLinkOpen}
        />
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

      {error && (
        <div
          role="alert"
          className="mx-7 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

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
            <OrgRow
              org={org}
              onUnlink={() => handleUnlink(org)}
              unlinking={unlinkingId === org.id}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrgRow({
  org,
  onUnlink,
  unlinking,
}: {
  org: KintalUserOrgMembership;
  onUnlink: () => void;
  unlinking: boolean;
}) {
  const RoleIcon =
    org.role === "owner" ? Crown : org.role === "admin" ? Shield : User;
  const canUnlink = org.role !== "owner";

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-7 py-4">
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

      {canUnlink ? (
        <button
          type="button"
          onClick={onUnlink}
          disabled={unlinking}
          aria-label="Desvincular da instituição"
          className="grid size-7 shrink-0 place-items-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {unlinking ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Link2Off className="size-3.5" />
          )}
        </button>
      ) : (
        <span aria-hidden className="size-7" />
      )}
    </div>
  );
}
