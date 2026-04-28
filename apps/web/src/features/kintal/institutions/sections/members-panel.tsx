import { Crown, User, Users } from "lucide-react";
import { buildDisplayUser } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import type { KintalInstitutionMember } from "../types";

const ROLE_LABEL: Record<KintalInstitutionMember["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Professor",
};

export function MembersPanel({
  members,
}: {
  members: KintalInstitutionMember[];
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2 pb-4">
        <Users className="size-4 text-gray-500" />
        <h2 className="text-xl font-medium tracking-tight text-ink">Membros</h2>
        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {members.length}
        </span>
      </header>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">Sem membros associados.</p>
      ) : (
        <ul className="flex flex-col">
          {members.map((m, i) => {
            const display = buildDisplayUser({ name: m.name, email: m.email });
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
              </li>
            );
          })}
        </ul>
      )}
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
