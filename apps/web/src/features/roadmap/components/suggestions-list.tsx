"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuggestionRow } from "./suggestion-row";
import { SuggestFeatureDialog } from "./suggest-feature-dialog";
import {
  PRODUCT_LABELS,
  ROADMAP_PRODUCTS,
  type RoadmapItemDto,
  type RoadmapProduct,
} from "../types";

interface SuggestionsListProps {
  items: RoadmapItemDto[];
  canVote: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
}

type Filter = "all" | RoadmapProduct;

// Lista vertical das sugestões, ordenada por votos (a API já vem ordenada).
// Filtro por produto + CTA de "sugerir" no header. Quando o user é
// anônimo, o CTA vira "Entrar pra sugerir".
export function SuggestionsList({
  items,
  canVote,
  isStaff,
  isAuthenticated,
}: SuggestionsListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.product === filter)),
    [items, filter],
  );

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <Sparkles className="size-3.5" />
            Sugestões da comunidade
          </div>
          <h2 className="text-2xl font-medium leading-tight tracking-tight text-ink md:text-[1.75rem]">
            O que você gostaria de ver na Lucida?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
            Vote nas ideias que fazem sentido pra você. As mais votadas entram
            na nossa lista de prioridades.
          </p>
        </div>
        <SuggestFeatureDialog isAuthenticated={isAuthenticated} />
      </header>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Todos (${items.length})`}
        />
        {ROADMAP_PRODUCTS.map((p) => {
          const count = items.filter((i) => i.product === p).length;
          return (
            <FilterChip
              key={p}
              active={filter === p}
              onClick={() => setFilter(p)}
              label={`${PRODUCT_LABELS[p]} (${count})`}
            />
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <SuggestionRow
              key={item.id}
              item={item}
              canVote={canVote}
              isStaff={isStaff}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white/40 p-10 text-center">
      <p className="text-sm text-gray-500">
        Nenhuma sugestão por aqui ainda. Seja a primeira pessoa a sugerir!
      </p>
    </div>
  );
}
