import Link from "next/link";
import { cn } from "@/lib/utils";
import type { OverviewPeriod } from "../data";

const OPTIONS: Array<{ value: OverviewPeriod; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "all", label: "Tudo" },
];

export function PeriodFilter({
  active,
  baseHref = "/app/analises",
}: {
  active: OverviewPeriod;
  baseHref?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Período"
      className="inline-flex shrink-0 rounded-pill bg-gray-100 p-1"
    >
      {OPTIONS.map((opt) => {
        const isActive = opt.value === active;
        return (
          <Link
            key={opt.value}
            href={`${baseHref}?period=${opt.value}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-white text-ink shadow-soft"
                : "text-gray-500 hover:text-ink",
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
