"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TurmaCard } from "@/features/app/turmas/turma-card";
import {
  TurmaFormDialog,
  type TurmaFormValues,
} from "@/features/app/turmas/turma-form-dialog";
import { DeleteTurmaDialog } from "@/features/app/turmas/delete-turma-dialog";
import {
  createTurmaAction,
  updateTurmaAction,
  deleteTurmaAction,
} from "@/features/app/turmas/actions";
import type { TurmaDTO } from "@/features/app/turmas/types";

type FilterKey = "withActive" | "noStudents" | "noExams";
type SortKey = "recent" | "alpha" | "students" | "exams";

interface TurmasInCursoProps {
  /** Curso onde estamos — fixa no form de criar/editar. */
  courseId: string;
  /** Turmas que pertencem ao curso (já enriquecidas). */
  turmas: TurmaDTO[];
}

/**
 * Listagem rica de turmas dentro do detalhe de um curso. Espelha o que
 * `/app/turmas` tinha (cards + busca + filtros + sort + CRUD), mas sem
 * agrupamento/filtro por curso — o curso é fixo, alimentado pelo pai.
 */
export function TurmasInCurso({ courseId, turmas }: TurmasInCursoProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    withActive: false,
    noStudents: false,
    noExams: false,
  });
  const [sort, setSort] = useState<SortKey>("recent");

  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<TurmaDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TurmaDTO | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = turmas.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (filters.withActive && t.activeExamsCount === 0) return false;
      if (filters.noStudents && t.studentsCount > 0) return false;
      if (filters.noExams && t.examsCount > 0) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      switch (sort) {
        case "alpha":
          return a.name.localeCompare(b.name, "pt-BR");
        case "students":
          return b.studentsCount - a.studentsCount;
        case "exams":
          return b.examsCount - a.examsCount;
        case "recent":
        default:
          return (b.lastActivityAt ?? b.createdAt).localeCompare(
            a.lastActivityAt ?? a.createdAt,
          );
      }
    });
    return list;
  }, [turmas, search, filters, sort]);

  const hasAnyFilter =
    search.trim().length > 0 ||
    filters.withActive ||
    filters.noStudents ||
    filters.noExams;

  function openCreate() {
    setDrawerMode("create");
    setEditTarget(null);
    setDrawerOpen(true);
  }

  function openEdit(turma: TurmaDTO) {
    setDrawerMode("edit");
    setEditTarget(turma);
    setDrawerOpen(true);
  }

  async function handleSubmit(values: TurmaFormValues) {
    const result =
      drawerMode === "edit" && editTarget
        ? await updateTurmaAction(editTarget.id, values)
        : await createTurmaAction(values);
    if (result.ok) startTransition(() => router.refresh());
    return { ok: result.ok, error: result.error?.message };
  }

  async function handleDelete() {
    if (!deleteTarget) return { ok: false, error: "Sem alvo." };
    const result = await deleteTurmaAction(deleteTarget.id);
    if (result.ok) startTransition(() => router.refresh());
    return { ok: result.ok, error: result.error?.message };
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="size-4 text-gray-400" />
            <span className="font-medium text-ink">
              {turmas.length} {turmas.length === 1 ? "turma" : "turmas"}
            </span>
          </div>
          <Button variant="primary" size="md" onClick={openCreate}>
            <Plus className="size-4" strokeWidth={2.5} />
            Nova turma
          </Button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar turmas..."
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterToggle
                active={filters.withActive}
                onToggle={() =>
                  setFilters((f) => ({ ...f, withActive: !f.withActive }))
                }
              >
                Com provas ativas
              </FilterToggle>
              <FilterToggle
                active={filters.noStudents}
                onToggle={() =>
                  setFilters((f) => ({ ...f, noStudents: !f.noStudents }))
                }
              >
                Sem alunos
              </FilterToggle>
              <FilterToggle
                active={filters.noExams}
                onToggle={() =>
                  setFilters((f) => ({ ...f, noExams: !f.noExams }))
                }
              >
                Sem provas
              </FilterToggle>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="turma-sort" className="text-gray-500">
              Ordenar
            </label>
            <select
              id="turma-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-ink transition-colors hover:border-gray-300 focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15"
            >
              <option value="recent">Recentes</option>
              <option value="alpha">A — Z</option>
              <option value="students">Mais alunos</option>
              <option value="exams">Mais provas</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((turma) => (
            <TurmaCard
              key={turma.id}
              turma={turma}
              onEdit={() => openEdit(turma)}
              onDelete={() => setDeleteTarget(turma)}
            />
          ))}
        </div>
      ) : hasAnyFilter ? (
        <EmptyFiltered
          onReset={() => {
            setSearch("");
            setFilters({ withActive: false, noStudents: false, noExams: false });
          }}
        />
      ) : (
        <EmptyNoData onCreate={openCreate} />
      )}

      <TurmaFormDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        turma={editTarget}
        cursos={[]}
        lockedCourseId={courseId}
        onSubmit={handleSubmit}
      />

      <DeleteTurmaDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        turma={deleteTarget}
        onConfirm={handleDelete}
      />
    </>
  );
}

function FilterToggle({
  active,
  onToggle,
  children,
}: {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand-primary/20 bg-brand-primary/10 text-brand-primary"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function EmptyNoData({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
        <Users className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-medium text-ink">Nenhuma turma ainda</h2>
        <p className="max-w-xs text-sm text-gray-500">
          Crie sua primeira turma neste curso pra começar a montar provas.
        </p>
      </div>
      <Button variant="primary" size="md" onClick={onCreate}>
        <Plus className="size-4" strokeWidth={2.5} />
        Criar turma
      </Button>
    </div>
  );
}

function EmptyFiltered({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center">
      <p className="text-sm text-gray-500">
        Nenhuma turma combina com esses filtros.
      </p>
      <Button variant="ghost" size="sm" onClick={onReset}>
        Limpar filtros
      </Button>
    </div>
  );
}
