"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import { STAGE_LABELS } from "../types";
import type { RoadmapItemDto } from "../types";

interface DeclinedAccordionProps {
  items: RoadmapItemDto[];
  canVote: boolean;
  isStaff: boolean;
}

// "Recusado" começa colapsado — não polui visualmente, mas dá histórico
// pra quem quer entender o que ficou de fora e por quê (staffNote vai
// no card).
export function DeclinedAccordion({
  items,
  canVote,
  isStaff,
}: DeclinedAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium uppercase tracking-[0.1em] text-gray-500">
            {STAGE_LABELS.declined}
          </span>
          <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {items.length}
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-gray-400" />
        ) : (
          <ChevronDown className="size-4 text-gray-400" />
        )}
      </button>
      <div
        className={cn(
          "grid gap-3 overflow-hidden px-5 transition-all",
          open
            ? "grid-cols-1 pb-5 md:grid-cols-2 lg:grid-cols-3"
            : "max-h-0 grid-cols-1",
        )}
      >
        {open &&
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              canVote={canVote}
              isStaff={isStaff}
            />
          ))}
      </div>
    </section>
  );
}
