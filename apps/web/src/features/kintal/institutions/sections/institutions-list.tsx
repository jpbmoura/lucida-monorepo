import Link from "next/link";
import { ChevronRight, Building2, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { billingModeLabel } from "../billing-mode-info";
import type { KintalInstitutionListItem } from "../types";

interface InstitutionsListProps {
  items: KintalInstitutionListItem[];
}

export function InstitutionsList({ items }: InstitutionsListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex flex-col items-center gap-2 px-7 py-20 text-center">
          <p className="text-sm font-medium text-ink">
            Nenhuma instituição com esse filtro.
          </p>
          <p className="max-w-sm text-[13px] text-gray-500">
            Ajuste a busca ou crie uma nova instituição pelo botão acima.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <div className="hidden grid-cols-[2fr_1.4fr_1.4fr_1fr_0.8fr_auto] items-center gap-4 border-b border-gray-100 px-7 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 lg:grid">
        <span>Instituição</span>
        <span>Plano</span>
        <span>Owner</span>
        <span className="text-right">Saldo</span>
        <span className="text-right">Membros</span>
        <span />
      </div>
      <ul>
        {items.map((it, i) => (
          <li
            key={it.id}
            className={
              i < items.length - 1 ? "border-b border-gray-50" : undefined
            }
          >
            <InstitutionRow item={it} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstitutionRow({ item }: { item: KintalInstitutionListItem }) {
  const archived = item.archivedAt !== null;
  const unlimited = item.billingMode === "unlimited";

  return (
    <Link
      href={`/kintal/instituicoes/${encodeURIComponent(item.id)}`}
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-4 px-7 py-4 transition-colors hover:bg-gray-50",
        "lg:grid-cols-[2fr_1.4fr_1.4fr_1fr_0.8fr_auto]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3 lg:contents">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-gradient-to-br from-ink to-gray-600 text-white">
          <Building2 className="size-4" />
        </span>
        <div className="min-w-0 lg:col-start-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium text-ink">
              {item.name}
            </span>
            {archived && (
              <span className="shrink-0 rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                Arquivada
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-gray-500">
            {item.slug ? `/${item.slug}` : "—"}
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 lg:block">
        <div className="flex items-center gap-1.5 text-[13px] text-ink">
          {unlimited && <InfinityIcon className="size-3.5 text-brand-primary" />}
          {billingModeLabel(item.billingMode)}
        </div>
      </div>

      <div className="hidden min-w-0 lg:block">
        {item.owner ? (
          <>
            <div className="truncate text-[13px] text-ink">
              {item.owner.name ?? item.owner.email}
            </div>
            <div className="truncate text-[11px] text-gray-500">
              {item.owner.email}
            </div>
          </>
        ) : (
          <span className="text-[12px] text-gray-400">Sem owner</span>
        )}
      </div>

      <div className="hidden text-right lg:block">
        {unlimited ? (
          <span className="text-[13px] text-gray-400">∞</span>
        ) : (
          <span className="text-[13px] font-medium tabular-nums text-ink">
            {item.creditBalance.toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <div className="hidden text-right text-[13px] text-gray-500 lg:block tabular-nums">
        {item.membersCount}
      </div>

      <ChevronRight className="size-4 text-gray-300" />
    </Link>
  );
}
