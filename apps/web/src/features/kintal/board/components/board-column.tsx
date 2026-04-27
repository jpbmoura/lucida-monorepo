"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffMember } from "@/features/kintal/acessos/types";
import { STATUS_LABELS, type CardStatus, type KanbanCard } from "../types";
import { CardTile } from "./card-tile";
import { CardFormDialog } from "./card-form-dialog";

interface BoardColumnProps {
  status: CardStatus;
  cards: KanbanCard[];
  staff: StaffMember[];
  staffById: Map<string, StaffMember>;
  onCardClick: (card: KanbanCard) => void;
}

export function BoardColumn({
  status,
  cards,
  staff,
  staffById,
  onCardClick,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-ink">
            {STATUS_LABELS[status]}
          </h2>
          <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            {cards.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label={`Adicionar card em ${STATUS_LABELS[status]}`}
          className="grid size-6 place-items-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 rounded-2xl border border-dashed p-2 transition-colors",
          isOver
            ? "border-brand-primary bg-brand-primary/5"
            : "border-gray-200 bg-gray-50/40",
        )}
      >
        {cards.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-2 py-6 text-center text-[11px] text-gray-400">
            {isOver ? "Soltar aqui" : "Nada por aqui ainda."}
          </div>
        ) : (
          cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              assignee={card.assigneeId ? (staffById.get(card.assigneeId) ?? null) : null}
              onClick={() => onCardClick(card)}
            />
          ))
        )}
      </div>

      <CardFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        staff={staff}
        presetStatus={status}
      />
    </div>
  );
}
