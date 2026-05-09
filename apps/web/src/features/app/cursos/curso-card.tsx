"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Users, FolderOpen } from "lucide-react";
import { ClickableCard, ClickableCardActions } from "@/components/ui/clickable-card";
import { formatRelativeTime } from "@/lib/relative-time";
import type { CursoDTO } from "./types";

interface CursoCardProps {
  curso: CursoDTO;
  onEdit: () => void;
  onDelete: () => void;
}

export function CursoCard({ curso, onEdit, onDelete }: CursoCardProps) {
  return (
    <ClickableCard
      href={`/app/cursos/${curso.id}`}
      ariaLabel={`Abrir ${curso.name}`}
      className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-soft"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <FolderOpen className="size-5" strokeWidth={2} />
          </span>
          <div className="flex flex-col leading-tight">
            <h3 className="text-[15px] font-medium tracking-tight text-ink">
              {curso.name}
            </h3>
            {curso.description && (
              <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-1">
                {curso.description}
              </p>
            )}
          </div>
        </div>

        <ClickableCardActions>
          <CardMenu onEdit={onEdit} onDelete={onDelete} />
        </ClickableCardActions>
      </header>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600">
          <Users className="size-3.5" />
          {curso.classCount} {curso.classCount === 1 ? "turma" : "turmas"}
        </span>
      </div>

      <footer className="flex items-center justify-between text-[11px] text-gray-400">
        <span>Atualizado {formatRelativeTime(curso.updatedAt)}</span>
        <span
          aria-hidden
          className="translate-x-0 text-gray-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
        >
          →
        </span>
      </footer>
    </ClickableCard>
  );
}

function CardMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  function click(handler: () => void) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      handler();
    };
  }

  return (
    <div className="relative z-10">
      <button
        type="button"
        aria-label="Ações do curso"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            className="fixed inset-0 z-40"
          />
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-50 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-pop"
          >
            <button
              type="button"
              role="menuitem"
              onClick={click(onEdit)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <Pencil className="size-4" />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={click(onDelete)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
