"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Upload,
  Printer,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AlunoDTO } from "../types";
import { AlunoFormDrawer } from "./aluno-form-drawer";
import { DeleteAlunoDialog } from "./delete-aluno-dialog";

interface AlunosTabProps {
  turmaId: string;
  alunos: AlunoDTO[];
}

export function AlunosTab({ turmaId, alunos }: AlunosTabProps) {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AlunoDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlunoDTO | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alunos;
    return alunos.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.matricula.toLowerCase().includes(q) ||
        a.code.includes(q) ||
        (a.email?.toLowerCase().includes(q) ?? false),
    );
  }, [alunos, search]);

  function openCreate() {
    setEditTarget(null);
    setDrawerOpen(true);
  }

  function openEdit(aluno: AlunoDTO) {
    setEditTarget(aluno);
    setDrawerOpen(true);
  }

  if (alunos.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Users className="size-5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-medium text-ink">Turma sem alunos</h3>
            <p className="max-w-sm text-sm text-gray-500">
              Cadastre um aluno manualmente ou importe uma planilha CSV com o nome, matrícula
              e e-mail da turma.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" size="md" onClick={openCreate}>
              <Plus className="size-4" strokeWidth={2.5} />
              Adicionar aluno
            </Button>
            <Button variant="outline" size="md" disabled title="Em breve">
              <Upload className="size-4" />
              Importar CSV
            </Button>
          </div>
        </div>

        <AlunoFormDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          turmaId={turmaId}
          aluno={editTarget}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código, matrícula..."
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" disabled title="Em breve">
            <Printer className="size-4" />
            Imprimir códigos
          </Button>
          <Button variant="outline" size="sm" disabled title="Em breve">
            <Upload className="size-4" />
            Importar CSV
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="size-4" strokeWidth={2.5} />
            Novo aluno
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Nenhum aluno combina com “{search}”.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                <th className="px-4 py-3 md:px-6">Código</th>
                <th className="px-4 py-3">Nome</th>
                <th className="hidden px-4 py-3 md:table-cell">Matrícula</th>
                <th className="hidden px-4 py-3 lg:table-cell">E-mail</th>
                <th className="px-4 py-3 md:px-6" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((aluno, i) => (
                <tr
                  key={aluno.id}
                  className={cn(
                    "transition-colors hover:bg-gray-50",
                    i < filtered.length - 1 && "border-b border-gray-100",
                  )}
                >
                  <td className="px-4 py-3 md:px-6">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-600">
                      {aluno.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{aluno.name}</td>
                  <td className="hidden px-4 py-3 tabular-nums text-gray-600 md:table-cell">
                    {aluno.matricula}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                    {aluno.email ?? (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Mail className="size-3" /> sem e-mail
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 md:px-6">
                    <AlunoRowMenu
                      alunoId={aluno.id}
                      onEdit={() => openEdit(aluno)}
                      onDelete={() => setDeleteTarget(aluno)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {filtered.length} {filtered.length === 1 ? "aluno" : "alunos"}
        </span>
      </div>

      <AlunoFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        turmaId={turmaId}
        aluno={editTarget}
      />

      <DeleteAlunoDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        turmaId={turmaId}
        aluno={deleteTarget}
      />
    </div>
  );
}

function AlunoRowMenu({
  alunoId,
  onEdit,
  onDelete,
}: {
  alunoId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Ações do aluno"
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <button aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-50 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-pop"
          >
            <Link
              href={`/app/analises/alunos/${alunoId}`}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <BarChart3 className="size-4" />
              Ver análises
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <Pencil className="size-4" />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Remover
            </button>
          </div>
        </>
      )}
    </div>
  );
}
