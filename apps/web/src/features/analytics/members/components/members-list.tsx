import { Users } from "lucide-react";
import { ClickableCard, ClickableCardActions } from "@/components/ui/clickable-card";
import type { MemberDTO } from "../data";
import { RevokeMemberButton } from "./revoke-member-button";

interface MembersListProps {
  members: MemberDTO[];
  /** ID do usuário logado — usado pra impedir auto-revogação (o owner não
   *  pode se revogar a si mesmo via esta UI). */
  currentUserId: string;
}

export function MembersList({ members, currentUserId }: MembersListProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
          <Users className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Professores ativos
          </h2>
          <p className="text-xs text-gray-500">
            {members.length === 1 ? "1 docente" : `${members.length} docentes`}
          </p>
        </div>
      </header>

      <ul className="flex flex-col divide-y divide-gray-100">
        {members.map((m) => {
          const canRevoke = m.role !== "owner" && m.id !== currentUserId;
          return (
            <ClickableCard
              key={m.id}
              as="li"
              href={`/analytics/professores/${m.id}`}
              ariaLabel={`Ver detalhes de ${m.name}`}
              className="flex items-center gap-4 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-gray-50/40"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-analytics-primary to-analytics-dark-01 text-[12px] font-semibold text-white">
                {initials(m.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {m.name}
                  </span>
                  {m.role === "owner" && (
                    <span className="rounded-full bg-analytics-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-analytics-primary">
                      Owner
                    </span>
                  )}
                  {m.role === "admin" && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                      Admin
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                  <span className="truncate">{m.email}</span>
                  <span aria-hidden>·</span>
                  <span className="whitespace-nowrap">
                    entrou {formatJoined(m.joinedAt)}
                  </span>
                </div>
              </div>

              {canRevoke && (
                <ClickableCardActions>
                  <RevokeMemberButton
                    memberName={m.name}
                    memberEmail={m.email}
                  />
                </ClickableCardActions>
              )}
            </ClickableCard>
          );
        })}
      </ul>
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

function formatJoined(iso: string): string {
  const then = new Date(iso);
  const now = Date.now();
  const diffDays = Math.floor((now - then.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `há ${diffDays} dias`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(then);
}
