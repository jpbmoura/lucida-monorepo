"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { StaffMember } from "@/features/kintal/acessos/types";
import {
  CARD_STATUSES,
  type CardStatus,
  type KanbanCard,
} from "../types";
import { moveCardAction } from "../data";
import { BoardColumn } from "./board-column";
import { CardTile } from "./card-tile";
import { CardFormDialog } from "./card-form-dialog";

interface BoardProps {
  initialCards: KanbanCard[];
  staff: StaffMember[];
}

export function Board({ initialCards, staff }: BoardProps) {
  const router = useRouter();
  // Local state pra optimistic move. Inicializa do server, atualiza
  // imediatamente quando user larga o card, e o server cuida de persistir
  // em background. Mismatch é raríssimo (single-user board interno).
  const [cards, setCards] = useState<KanbanCard[]>(initialCards);
  const [draggingCard, setDraggingCard] = useState<KanbanCard | null>(null);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Pointer sensor com distância mínima de 5px — abaixo disso, o gesto vira
  // click (abre dialog em vez de drag).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const staffById = useMemo(() => {
    const m = new Map<string, StaffMember>();
    for (const s of staff) m.set(s.id, s);
    return m;
  }, [staff]);

  const cardsByStatus = useMemo(() => {
    const buckets: Record<CardStatus, KanbanCard[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const card of cards) {
      buckets[card.status].push(card);
    }
    return buckets;
  }, [cards]);

  function handleDragStart(event: DragStartEvent) {
    const card = event.active.data.current?.card as KanbanCard | undefined;
    setDraggingCard(card ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingCard(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.data.current?.status as CardStatus | undefined;
    if (!newStatus) return;

    const cardId = active.id as string;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newStatus) return;

    // Optimistic update + reconcile com a resposta do server quando chegar.
    const previous = cards;
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: newStatus,
              completedAt:
                newStatus === "done" ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );

    void moveCardAction(cardId, newStatus).then((result) => {
      if (!result.ok) {
        // Rollback + mostra erro. Drag & drop é alta-frequência, falha
        // silenciosa irrita; um banner top é suficiente.
        setCards(previous);
        setMoveError(result.message);
        return;
      }
      // Refresh server state pra refletir auto-arquivo (se moveu pra done
      // e tem cards velhos pra sumir) ou qualquer side effect futuro.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {moveError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{moveError}</span>
          <button
            type="button"
            onClick={() => setMoveError(null)}
            className="rounded-md px-2 py-0.5 text-xs hover:bg-red-100"
          >
            fechar
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingCard(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {CARD_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              cards={cardsByStatus[status]}
              staff={staff}
              staffById={staffById}
              onCardClick={setEditingCard}
            />
          ))}
        </div>

        <DragOverlay>
          {draggingCard ? (
            <div className="rotate-2 cursor-grabbing">
              <CardTile
                card={draggingCard}
                assignee={
                  draggingCard.assigneeId
                    ? (staffById.get(draggingCard.assigneeId) ?? null)
                    : null
                }
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingCard && (
        <CardFormDialog
          open={Boolean(editingCard)}
          onOpenChange={(o) => {
            if (!o) setEditingCard(null);
          }}
          staff={staff}
          card={editingCard}
        />
      )}
    </div>
  );
}
