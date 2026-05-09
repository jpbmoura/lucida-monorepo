"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CursoFormDialog, type CursoFormValues } from "./curso-form-dialog";
import { DeleteCursoDialog } from "./delete-curso-dialog";
import { updateCursoAction, deleteCursoAction } from "./actions";
import { TurmasInCurso } from "./turmas-in-curso";
import type { CursoDetailDTO, CursoDTO } from "./types";

interface CursoDetailProps {
  curso: CursoDetailDTO;
}

export function CursoDetail({ curso }: CursoDetailProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // DTO compatível pra reusar os mesmos dialogs da listagem.
  const cursoBasic: CursoDTO = {
    id: curso.id,
    name: curso.name,
    description: curso.description,
    classCount: curso.classCount,
    createdAt: curso.createdAt,
    updatedAt: curso.updatedAt,
  };

  async function handleSubmit(values: CursoFormValues) {
    const result = await updateCursoAction(curso.id, values);
    if (result.ok) startTransition(() => router.refresh());
    return { ok: result.ok, error: result.error?.message };
  }

  async function handleDelete() {
    const result = await deleteCursoAction(curso.id);
    if (result.ok) {
      router.push("/app/cursos");
      router.refresh();
    }
    return {
      ok: result.ok,
      error: result.error?.message,
      code: result.error?.code,
    };
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href="/app/cursos"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" />
          Cursos
        </Link>
      </div>

      <header className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <FolderOpen className="size-6" strokeWidth={2} />
          </span>
          <div className="flex flex-col">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
              Curso
            </div>
            <h1 className="text-3xl font-medium leading-tight tracking-tight text-ink md:text-4xl">
              {curso.name}
            </h1>
            {curso.description && (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-gray-500">
                {curso.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar curso
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => setDeleteOpen(true)}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
            Excluir
          </Button>
        </div>
      </header>

      <section className="mt-8">
        <TurmasInCurso courseId={curso.id} turmas={curso.classes} />
      </section>

      <CursoFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        curso={cursoBasic}
        onSubmit={handleSubmit}
      />

      <DeleteCursoDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        curso={cursoBasic}
        onConfirm={handleDelete}
      />
    </>
  );
}
