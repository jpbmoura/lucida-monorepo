"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, Trash2, User, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildDisplayUser } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { removeInstitutionMemberAction } from "../data";
import type { KintalInstitutionMember } from "../types";
import { AddMemberDialog } from "../components/add-member-dialog";

const ROLE_LABEL: Record<KintalInstitutionMember["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Professor",
};

interface MembersPanelProps {
  orgId: string;
  members: KintalInstitutionMember[];
}

export function MembersPanel({ orgId, members }: MembersPanelProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(member: KintalInstitutionMember) {
    if (member.role === "owner") return;
    if (
      !window.confirm(
        `Remover ${member.name ?? member.email} da instituição?`,
      )
    ) {
      return;
    }
    setError(null);
    setRemovingId(member.id);
    const res = await removeInstitutionMemberAction(orgId, member.id);
    setRemovingId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2 pb-4">
        <Users className="size-4 text-gray-500" />
        <h2 className="text-xl font-medium tracking-tight text-ink">Membros</h2>
        <span className="text-xs text-gray-400 tabular-nums">
          {members.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setAddOpen(true)}
        >
          <UserPlus className="size-3.5" />
          Adicionar
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">Sem membros associados.</p>
      ) : (
        <ul className="flex flex-col">
          {members.map((m, i) => {
            const display = buildDisplayUser({ name: m.name, email: m.email });
            const removable = m.role !== "owner";
            const isRemoving = removingId === m.id;
            return (
              <li
                key={m.id}
                className={cn(
                  "flex items-center gap-3 py-3",
                  i < members.length - 1 && "border-b border-gray-50",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-[11px] font-semibold text-white">
                  {display.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {display.name}
                    </span>
                    <RoleBadge role={m.role} />
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {m.email}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-gray-400">
                  desde{" "}
                  {new Date(m.joinedAt).toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {removable && (
                  <button
                    type="button"
                    onClick={() => handleRemove(m)}
                    disabled={isRemoving}
                    aria-label="Remover membro"
                    className="grid size-7 shrink-0 place-items-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {isRemoving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddMemberDialog
        orgId={orgId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </section>
  );
}

function RoleBadge({ role }: { role: KintalInstitutionMember["role"] }) {
  const Icon = role === "owner" ? Crown : User;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        role === "owner"
          ? "bg-amber-50 text-amber-700"
          : role === "admin"
            ? "bg-blue-50 text-blue-700"
            : "bg-gray-100 text-gray-500",
      )}
    >
      <Icon className="size-2.5" strokeWidth={2.5} />
      {ROLE_LABEL[role]}
    </span>
  );
}
