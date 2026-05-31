"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Slide } from "../types";
import { SlideThumb } from "./slide-thumb";

// Miniatura arrastável (dnd-kit sortable). O tema é herdado do DeckFrame que
// envolve o trilho; o SlideCanvas auto-escala via container queries.
export function SortableThumb({
  slide,
  index,
  selected,
  onSelect,
}: {
  slide: Slide;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-80")}
    >
      <button
        onClick={onSelect}
        {...attributes}
        {...listeners}
        className={cn(
          "block w-full cursor-grab overflow-hidden rounded-lg border-2 text-left transition active:cursor-grabbing",
          selected ? "border-brand-primary" : "border-transparent hover:border-gray-200",
        )}
      >
        <span className="absolute left-1 top-1 z-10 rounded bg-black/40 px-1.5 text-[10px] font-medium text-white">
          {index + 1}
        </span>
        <SlideThumb slide={slide} />
      </button>
    </div>
  );
}
