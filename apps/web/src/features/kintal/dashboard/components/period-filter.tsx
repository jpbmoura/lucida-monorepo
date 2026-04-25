import Link from "next/link";
import { cn } from "@/lib/utils";
import { PERIOD_LABELS, type PeriodScope } from "../types";

const ORDER: PeriodScope[] = ["today", "7d", "30d", "90d"];

interface PeriodFilterProps {
  active: PeriodScope;
  baseHref?: string;
}

// Reaproveita o shape `rounded-pill bg-gray-100` do filtro de período do
// /app e /analytics. É server-renderável (só Link) — dispensa o
// useTransition do componente anterior porque o RSC recarrega a tela
// inteira com o novo searchParam.
export function PeriodFilter({
  active,
  baseHref = "/kintal",
}: PeriodFilterProps) {
  return (
    <div
      role="tablist"
      aria-label="Período"
      className="inline-flex shrink-0 rounded-pill bg-gray-100 p-1"
    >
      {ORDER.map((p) => {
        const isActive = p === active;
        return (
          <Link
            key={p}
            href={`${baseHref}?period=${p}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-white text-ink shadow-soft"
                : "text-gray-500 hover:text-ink",
            )}
          >
            {PERIOD_LABELS[p]}
          </Link>
        );
      })}
    </div>
  );
}
