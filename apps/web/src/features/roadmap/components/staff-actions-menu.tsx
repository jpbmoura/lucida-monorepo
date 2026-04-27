"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteRoadmapItemAction } from "../data";
import { EditItemDialog } from "./edit-item-dialog";
import type { RoadmapItemDto } from "../types";

interface StaffActionsMenuProps {
  item: RoadmapItemDto;
}

// Popover compacto com ações staff: editar (abre dialog) e excluir (com
// confirmação inline). Visualmente discreto pra não dominar o card.
export function StaffActionsMenu({ item }: StaffActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteRoadmapItemAction(item.id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Ações de staff"
          className={cn(
            "grid size-7 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink",
            open && "bg-gray-100 text-ink",
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-hidden
              onClick={() => {
                setOpen(false);
                setConfirming(false);
                setError(null);
              }}
              className="fixed inset-0 z-40"
            />
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-pop"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setEditing(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
              >
                <Pencil className="size-4" />
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                disabled={isPending}
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors disabled:opacity-50",
                  confirming
                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : "text-gray-700 hover:bg-gray-50 hover:text-ink",
                )}
              >
                <Trash2 className="size-4" />
                {isPending
                  ? "Excluindo..."
                  : confirming
                    ? "Confirmar exclusão"
                    : "Excluir"}
              </button>
              {error && (
                <p className="border-t border-gray-100 px-4 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {editing && (
        <EditItemDialog
          item={item}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
    </>
  );
}
