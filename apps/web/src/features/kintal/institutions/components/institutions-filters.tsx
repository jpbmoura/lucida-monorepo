"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ArchivedFilter } from "../types";

const ARCHIVED_OPTIONS: Array<{ value: ArchivedFilter; label: string }> = [
  { value: "active", label: "Ativas" },
  { value: "all", label: "Todas" },
  { value: "archived", label: "Arquivadas" },
];

interface InstitutionsFiltersProps {
  q: string;
  archived: ArchivedFilter;
}

export function InstitutionsFilters({ q, archived }: InstitutionsFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [localQ, setLocalQ] = useState(q);

  // Debounce 300ms — evita rebuscar a cada keystroke. Sincroniza estado
  // local com URL caso o user navegue de volta.
  useEffect(() => {
    setLocalQ(q);
  }, [q]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (localQ === q) return;
      const next = new URLSearchParams(sp.toString());
      if (localQ.trim()) next.set("q", localQ.trim());
      else next.delete("q");
      startTransition(() => {
        router.replace(`?${next.toString()}`);
      });
    }, 300);
    return () => window.clearTimeout(handle);
    // sp e router sempre estáveis em prática — observamos só localQ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQ]);

  function setArchived(value: ArchivedFilter) {
    const next = new URLSearchParams(sp.toString());
    if (value === "active") next.delete("archived");
    else next.set("archived", value);
    startTransition(() => {
      router.replace(`?${next.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="Buscar por nome ou slug..."
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-1 rounded-pill border border-gray-100 bg-white p-1">
        {ARCHIVED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setArchived(opt.value)}
            className={cn(
              "rounded-pill px-3 py-1 text-xs font-medium transition-colors",
              archived === opt.value
                ? "bg-ink text-white"
                : "text-gray-500 hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
