"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveTurmaInitials } from "@/features/app/turmas/utils";
import type { TurmaDTO } from "@/features/app/turmas/types";

interface NewExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewExamDialog({ open, onOpenChange }: NewExamDialogProps) {
  const router = useRouter();
  const [turmas, setTurmas] = useState<TurmaDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Carrega turmas no 1º open — cacheia entre aberturas da mesma sessão.
  useEffect(() => {
    if (!open || turmas !== null) return;
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    fetch("/v1/classes", { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Falha ao buscar turmas (${r.status})`);
        return (await r.json()) as { data: TurmaDTO[] };
      })
      .then((j) => setTurmas(j.data))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message ?? "Erro ao carregar turmas.");
        }
      })
      .finally(() => setLoading(false));
    return () => abort.abort();
  }, [open, turmas]);

  // Reset da busca ao fechar pra próxima abertura começar limpa.
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = (turmas ?? []).filter((t) =>
    search.trim() === ""
      ? true
      : t.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function pickTurma(turmaId: string) {
    onOpenChange(false);
    router.push(`/app/turmas/${turmaId}/provas/nova`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Qual turma vai receber a prova?</DialogTitle>
          <DialogDescription>
            Escolha a turma. Nas etapas seguintes você envia o material e
            configura a prova.
          </DialogDescription>
        </DialogHeader>

        {loading && turmas === null && (
          <div className="py-8 text-center text-sm text-gray-500">
            Carregando turmas...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {turmas && turmas.length === 0 && (
          <EmptyState onClose={() => onOpenChange(false)} />
        )}

        {turmas && turmas.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar turma..."
                className="pl-10"
                autoFocus
              />
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-6 text-center text-sm text-gray-500">
                Nenhuma turma combina com “{search}”.
              </div>
            ) : (
              <ul className="flex max-h-[320px] flex-col gap-1 overflow-y-auto pr-1">
                {filtered.map((turma) => (
                  <li key={turma.id}>
                    <button
                      type="button"
                      onClick={() => pickTurma(turma.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary text-[13px] font-semibold text-white">
                        {deriveTurmaInitials(turma.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink">
                          {turma.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3" /> {turma.studentsCount}{" "}
                            {turma.studentsCount === 1 ? "aluno" : "alunos"}
                          </span>
                          <span className="size-0.5 rounded-full bg-gray-300" />
                          <span className="inline-flex items-center gap-1">
                            <FileText className="size-3" /> {turma.examsCount}{" "}
                            {turma.examsCount === 1 ? "prova" : "provas"}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
        <Users className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium text-ink">
          Você ainda não tem turmas
        </h3>
        <p className="max-w-xs text-xs text-gray-500">
          Antes de criar uma prova, precisa ter uma turma. Ela organiza os
          alunos que vão responder.
        </p>
      </div>
      <Button asChild variant="primary" size="md" onClick={onClose}>
        <Link href="/app/cursos">
          <Plus className="size-4" strokeWidth={2.5} />
          Ir pra cursos
        </Link>
      </Button>
    </div>
  );
}
