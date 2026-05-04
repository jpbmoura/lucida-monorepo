"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { buildDisplayUser } from "@/lib/user-display";
import type { StaffMember } from "@/features/kintal/acessos/types";
import {
  CARD_TAGS,
  PRIORITY_DOT_CLASS,
  PRIORITY_LABELS,
  TAG_COLOR_CLASSES,
  type KanbanCard,
} from "../types";

interface CardTileProps {
  card: KanbanCard;
  assignee: StaffMember | null;
  onClick: () => void;
}

export function CardTile({ card, assignee, onClick }: CardTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: { card },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    // Durante drag, esconde o item original e mostra o ghost via DragOverlay
    // (definido no Board). Aqui só cuidamos de aparecer "sumindo" pra evitar
    // duplicação visual.
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      // Click vs drag: dnd-kit dispara click somente quando não houve drag
      // significativo. Usamos onClick direto pra abrir edit dialog.
      onClick={(e) => {
        // Não dispara click quando estava arrastando (transform > 0).
        if (transform && (Math.abs(transform.x) > 3 || Math.abs(transform.y) > 3)) return;
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "group cursor-grab rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all",
        "hover:border-gray-300 hover:shadow-md active:cursor-grabbing",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          aria-label={`Prioridade ${PRIORITY_LABELS[card.priority]}`}
          className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT_CLASS[card.priority])}
        />
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">
          {PRIORITY_LABELS[card.priority]}
        </span>
      </div>

      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">
        {card.title}
      </h3>

      {card.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags.map((tagId) => {
            const tag = CARD_TAGS[tagId];
            if (!tag) return null;
            return (
              <span
                key={tagId}
                className={cn(
                  "rounded-pill border px-2 py-0.5 text-[10px] font-medium",
                  TAG_COLOR_CLASSES[tag.color],
                )}
              >
                {tag.label}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {assignee ? (
          (() => {
            const display = buildDisplayUser({
              name: assignee.name,
              email: assignee.email,
              fallback: "email",
            });
            return (
              <span
                className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-[10px] font-semibold text-white"
                title={display.name}
              >
                {display.initials}
              </span>
            );
          })()
        ) : (
          <span className="grid size-6 place-items-center rounded-full border border-dashed border-gray-200 text-[10px] text-gray-400">
            ?
          </span>
        )}
        <span className="text-[10px] text-gray-400">
          {formatRelative(card.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoje";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
