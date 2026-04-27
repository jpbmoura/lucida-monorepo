import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buildDisplayUser } from "@/lib/user-display";
import { formatInt } from "@/features/kintal/dashboard/format";
import { PLAN_LABELS, type KintalUserListItem } from "../types";

interface UsersListProps {
  users: KintalUserListItem[];
}

export function UsersList({ users }: UsersListProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex flex-col items-center gap-2 px-7 py-20 text-center">
          <p className="text-sm font-medium text-ink">
            Ninguém com esse filtro.
          </p>
          <p className="max-w-sm text-[13px] text-gray-500">
            Ajuste a busca ou os filtros — nada por aqui pelo critério atual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <div className="hidden grid-cols-[2.5fr_1.5fr_1.2fr_1fr_auto] items-center gap-4 border-b border-gray-100 px-7 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 lg:grid">
        <span>Pessoa</span>
        <span>Cadastro</span>
        <span>Assinatura</span>
        <span className="text-right">Saldo</span>
        <span />
      </div>
      <ul>
        {users.map((u, i) => (
          <li
            key={u.id}
            className={
              i < users.length - 1 ? "border-b border-gray-50" : undefined
            }
          >
            <UserRow user={u} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserRow({ user }: { user: KintalUserListItem }) {
  const display = buildDisplayUser({ name: user.name, email: user.email });
  const isStaff = user.role === "staff";

  return (
    <Link
      href={`/kintal/usuarios/${encodeURIComponent(user.id)}`}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-7 py-4 transition-colors hover:bg-gray-50 lg:grid-cols-[2.5fr_1.5fr_1.2fr_1fr_auto]"
    >
      <div className="flex min-w-0 items-center gap-3 lg:contents">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-[12px] font-semibold text-white">
          {display.initials}
        </span>
        <div className="min-w-0 lg:col-start-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium text-ink">
              {display.name}
            </span>
            {isStaff && (
              <span className="shrink-0 rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                Staff
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-gray-500">
            {user.email}
          </div>
        </div>
      </div>

      <div className="hidden text-xs text-gray-500 lg:block">
        {formatRelative(user.createdAt)}
      </div>

      <div className="hidden text-xs lg:block">
        {user.subscription ? (
          <span
            className={
              user.subscription.status === "active"
                ? "inline-flex items-center gap-1.5 text-ink"
                : "inline-flex items-center gap-1.5 text-amber-600"
            }
          >
            <span
              className={
                user.subscription.status === "active"
                  ? "size-1.5 rounded-full bg-emerald-500"
                  : "size-1.5 rounded-full bg-amber-500"
              }
            />
            <span className="truncate font-medium">
              {PLAN_LABELS[user.subscription.planId] ?? user.subscription.planId}
            </span>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>

      <div className="hidden text-right text-sm font-medium tabular-nums text-ink lg:block">
        {formatInt(user.creditBalance)}
      </div>

      <ChevronRight className="size-4 shrink-0 text-gray-400" />
    </Link>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoje";
  if (days < 7) return `há ${days}d`;
  if (days < 30) return `há ${Math.floor(days / 7)}sem`;
  if (days < 365) return `há ${Math.floor(days / 30)}m`;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
