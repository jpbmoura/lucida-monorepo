"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type TurmaTab = "provas" | "alunos";

interface TabsSwitcherProps {
  turmaId: string;
  counts: { provas: number; alunos: number };
}

const TABS: Array<{ key: TurmaTab; label: string }> = [
  { key: "provas", label: "Provas" },
  { key: "alunos", label: "Alunos" },
];

export function TabsSwitcher({ counts }: TabsSwitcherProps) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") as TurmaTab | null) ?? "provas";

  return (
    <nav
      role="tablist"
      aria-label="Seções da turma"
      className="flex gap-4 border-b border-gray-100"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const params = new URLSearchParams(searchParams.toString());
        if (tab.key === "provas") params.delete("tab");
        else params.set("tab", tab.key);
        const query = params.toString();

        return (
          <Link
            key={tab.key}
            href={query ? `?${query}` : "?"}
            replace
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-ink text-ink"
                : "border-transparent text-gray-500 hover:text-ink",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                isActive ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-400",
              )}
            >
              {counts[tab.key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
