import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildDisplayUser } from "@/lib/user-display";
import { formatInt } from "@/features/kintal/dashboard/format";
import { PLAN_LABELS, type KintalUserListItem } from "../types";

interface UsersListProps {
  users: KintalUserListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  /**
   * URL base com searchParams atuais. O componente adiciona/atualiza
   * `page` e `pageSize` em cima dela. Ex: `/kintal/usuarios?q=foo&role=staff`.
   */
  baseHref: string;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function UsersList({
  users,
  page,
  pageSize,
  total,
  hasMore,
  baseHref,
}: UsersListProps) {
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
    <div className="flex flex-col gap-4">
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

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        hasMore={hasMore}
        baseHref={baseHref}
      />
    </div>
  );
}

function UserRow({ user }: { user: KintalUserListItem }) {
  const display = buildDisplayUser({
    name: user.name,
    email: user.email,
    fallback: "email",
  });
  const isStaff = user.role === "staff";

  return (
    <Link
      href={`/kintal/usuarios/${encodeURIComponent(user.id)}`}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-7 py-4 transition-colors hover:bg-gray-50 lg:grid-cols-[2.5fr_1.5fr_1.2fr_1fr_auto]"
    >
      <div className="flex min-w-0 items-center gap-3 lg:contents">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-ink to-gray-600 text-[12px] font-semibold text-white">
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

// ─── Pagination ─────────────────────────────────────────────────────

function Pagination({
  page,
  pageSize,
  total,
  hasMore,
  baseHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  baseHref: string;
}) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="text-xs text-gray-500">
        {total === 0 ? (
          "Nenhum resultado."
        ) : (
          <>
            Mostrando <span className="font-medium text-ink">{from}</span>–
            <span className="font-medium text-ink">{to}</span> de{" "}
            <span className="font-medium text-ink">
              {total.toLocaleString("pt-BR")}
            </span>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PageSizeSelector current={pageSize} baseHref={baseHref} />
        <PageNav
          page={page}
          totalPages={totalPages}
          hasMore={hasMore}
          baseHref={baseHref}
        />
      </div>
    </div>
  );
}

function PageSizeSelector({
  current,
  baseHref,
}: {
  current: number;
  baseHref: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
        Por página
      </span>
      <div className="inline-flex rounded-pill bg-gray-100 p-1">
        {PAGE_SIZE_OPTIONS.map((opt) => {
          const active = opt === current;
          // Trocar tamanho de página volta pra page=1 (caso contrário a
          // page atual pode ficar fora do range novo).
          const href = updateSearchParams(baseHref, {
            pageSize: opt === 50 ? null : String(opt),
            page: null,
          });
          return (
            <Link
              key={opt}
              href={href}
              scroll={false}
              className={
                active
                  ? "rounded-pill bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-soft"
                  : "rounded-pill px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-ink"
              }
            >
              {opt}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PageNav({
  page,
  totalPages,
  hasMore,
  baseHref,
}: {
  page: number;
  totalPages: number;
  hasMore: boolean;
  baseHref: string;
}) {
  const canPrev = page > 1;
  const canNext = hasMore;

  const prevHref = updateSearchParams(baseHref, {
    page: page - 1 <= 1 ? null : String(page - 1),
  });
  const nextHref = updateSearchParams(baseHref, {
    page: String(page + 1),
  });

  return (
    <div className="inline-flex items-center gap-2 text-xs text-gray-600">
      <NavButton href={prevHref} disabled={!canPrev} ariaLabel="Página anterior">
        <ChevronLeft className="size-3.5" />
      </NavButton>
      <span className="tabular-nums">
        Página <span className="font-medium text-ink">{page}</span>
        <span className="text-gray-400"> de </span>
        <span className="font-medium text-ink">{totalPages}</span>
      </span>
      <NavButton href={nextHref} disabled={!canNext} ariaLabel="Próxima página">
        <ChevronRight className="size-3.5" />
      </NavButton>
    </div>
  );
}

function NavButton({
  href,
  disabled,
  ariaLabel,
  children,
}: {
  href: string;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        aria-label={ariaLabel}
        className="grid size-7 place-items-center rounded-full border border-gray-100 bg-gray-50 text-gray-300"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={ariaLabel}
      className="grid size-7 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-ink"
    >
      {children}
    </Link>
  );
}

/**
 * Atualiza/remove search params em cima do `baseHref`. Valor `null`
 * remove o param. Mantém os outros.
 */
function updateSearchParams(
  baseHref: string,
  patch: Record<string, string | null>,
): string {
  const [path, search = ""] = baseHref.split("?");
  const sp = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) sp.delete(key);
    else sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : (path ?? "");
}
