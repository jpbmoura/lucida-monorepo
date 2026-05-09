"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CursoCard } from "./curso-card";
import { CursoFormDialog, type CursoFormValues } from "./curso-form-dialog";
import { DeleteCursoDialog } from "./delete-curso-dialog";
import {
  createCursoAction,
  updateCursoAction,
  deleteCursoAction,
} from "./actions";
import type { CursoDTO } from "./types";

interface CursosListProps {
  initialCursos: CursoDTO[];
}

export function CursosList({ initialCursos }: CursosListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<CursoDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CursoDTO | null>(null);

  function openCreate() {
    setDrawerMode("create");
    setEditTarget(null);
    setDrawerOpen(true);
  }

  function openEdit(curso: CursoDTO) {
    setDrawerMode("edit");
    setEditTarget(curso);
    setDrawerOpen(true);
  }

  async function handleSubmit(values: CursoFormValues) {
    const result =
      drawerMode === "edit" && editTarget
        ? await updateCursoAction(editTarget.id, values)
        : await createCursoAction(values);
    if (result.ok) startTransition(() => router.refresh());
    return { ok: result.ok, error: result.error?.message };
  }

  async function handleDelete() {
    if (!deleteTarget) return { ok: false, error: "Sem alvo." };
    const result = await deleteCursoAction(deleteTarget.id);
    if (result.ok) startTransition(() => router.refresh());
    return {
      ok: result.ok,
      error: result.error?.message,
      code: result.error?.code,
    };
  }

  return (
    <>
      <div className="flex flex-col gap-8 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="pulse-dot" />
            Seus cursos
          </div>
          <h1 className="flex flex-wrap items-baseline gap-3 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Cursos
            <span className="rounded-md bg-gray-100 px-2 py-1 text-sm font-medium tabular-nums text-gray-600">
              {initialCursos.length}
            </span>
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-500">
            Use cursos pra agrupar suas turmas — por instituição, série, projeto
            ou como fizer sentido pra você.
          </p>
        </div>

        <Button variant="primary" size="lg" onClick={openCreate}>
          <Plus className="size-4" strokeWidth={2.5} />
          Novo curso
        </Button>
      </div>

      {initialCursos.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialCursos.map((curso) => (
            <CursoCard
              key={curso.id}
              curso={curso}
              onEdit={() => openEdit(curso)}
              onDelete={() => setDeleteTarget(curso)}
            />
          ))}
        </div>
      ) : (
        <EmptyNoData onCreate={openCreate} />
      )}

      <CursoFormDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        curso={editTarget}
        onSubmit={handleSubmit}
      />

      <DeleteCursoDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        curso={deleteTarget}
        onConfirm={handleDelete}
      />
    </>
  );
}

function EmptyNoData({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
        <FolderOpen className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-medium text-ink">Nenhum curso ainda</h2>
        <p className="max-w-xs text-sm text-gray-500">
          Crie seu primeiro curso pra organizar suas turmas.
        </p>
      </div>
      <Button variant="primary" size="md" onClick={onCreate}>
        <Plus className="size-4" strokeWidth={2.5} />
        Criar primeiro curso
      </Button>
    </div>
  );
}
