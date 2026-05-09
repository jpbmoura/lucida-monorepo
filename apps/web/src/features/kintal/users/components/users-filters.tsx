"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CREATED_WITHIN_FILTERS,
  ROLE_FILTERS,
  SUBSCRIPTION_FILTERS,
  type CreatedWithinFilter,
  type RoleFilter,
  type SubscriptionFilter,
} from "../types";

interface UsersFiltersProps {
  q: string;
  subscription: SubscriptionFilter;
  role: RoleFilter;
  createdWithin: CreatedWithinFilter;
}

// Filtros server-driven via searchParams. Search aplica no blur ou Enter
// (não é instant-search) — staff tem controle total sobre quando recarrega.
// Pills/dropdowns de subscription/role/cadastro aplicam imediato no clique
// (clique já é uma ação intencional). Trocar qualquer filtro reseta page=1.
export function UsersFilters({
  q,
  subscription,
  role,
  createdWithin,
}: UsersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState(q);

  useEffect(() => setDraft(q), [q]);

  function pushParam(key: string, value: string | null) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "any" || value === "all") {
      sp.delete(key);
    } else {
      sp.set(key, value);
    }
    // Trocar qualquer filtro volta pra página 1 — paginação fica
    // dessincronizada se mantemos a mesma page após filtrar.
    sp.delete("page");
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function commitSearch() {
    const trimmed = draft.trim();
    if (trimmed === q) return;
    pushParam("q", trimmed || null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSearch();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(q);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Buscar por nome ou e-mail (Enter pra aplicar)..."
            className="h-11 w-full rounded-pill border border-gray-200 bg-white pl-11 pr-10 text-sm text-ink transition-colors placeholder:text-gray-400 focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                pushParam("q", null);
              }}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PillGroup
            label="Tipo"
            value={role}
            options={ROLE_FILTERS}
            onChange={(v) => pushParam("role", v)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PillGroup
          label="Cadastro"
          value={createdWithin}
          options={CREATED_WITHIN_FILTERS}
          onChange={(v) => pushParam("createdWithin", v)}
        />
        <PillGroup
          label="Assinatura"
          value={subscription}
          options={SUBSCRIPTION_FILTERS}
          onChange={(v) => pushParam("subscription", v)}
        />
      </div>
    </div>
  );
}

interface PillGroupProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function PillGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: PillGroupProps<T>) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>
      <div className="inline-flex shrink-0 rounded-pill bg-gray-100 p-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-white text-ink shadow-soft"
                  : "text-gray-500 hover:text-ink",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
