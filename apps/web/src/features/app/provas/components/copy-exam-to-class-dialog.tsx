"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { deriveTurmaInitials } from "@/features/app/turmas/utils";
import type { TurmaDTO } from "@/features/app/turmas/types";

interface CopyExamToClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examTitle: string;
  /** Turma de origem — removida da lista (a cópia vai para OUTRA turma). */
  currentClassId: string;
  onConfirm: (
    targetClassId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function CopyExamToClassDialog({
  open,
  onOpenChange,
  examTitle,
  currentClassId,
  onConfirm,
}: CopyExamToClassDialogProps) {
  const [turmas, setTurmas] = useState<TurmaDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  // Reset ao fechar pra próxima abertura começar limpa.
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedId(null);
      setError(null);
    }
  }, [open]);

  const available = (turmas ?? []).filter((t) => t.id !== currentClassId);
  const filtered = available.filter((t) =>
    search.trim() === ""
      ? true
      : t.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function handleConfirm() {
    if (!selectedId) {
      setError("Selecione a turma de destino.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await onConfirm(selectedId);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível copiar a prova.");
        return;
      }
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copiar prova para outra turma</DialogTitle>
          <DialogDescription>
            Escolha a turma de destino. As questões de “{examTitle}” são
            copiadas; as submissões não.
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

        {turmas && available.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-6 text-center text-sm text-gray-500">
            Você não tem outra turma para copiar esta prova.
          </div>
        )}

        {turmas && available.length > 0 && (
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
                {filtered.map((turma) => {
                  const selected = turma.id === selectedId;
                  return (
                    <li key={turma.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(turma.id)}
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-brand-primary bg-brand-primary/5"
                            : "border-gray-100 bg-white hover:border-brand-primary/30 hover:bg-brand-primary/5",
                        )}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary text-[13px] font-semibold text-white">
                          {deriveTurmaInitials(turma.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-ink">
                            {turma.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                            <Users className="size-3" /> {turma.studentsCount}{" "}
                            {turma.studentsCount === 1 ? "aluno" : "alunos"}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={busy || !selectedId || turmas === null}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
            {busy ? "Copiando..." : "Copiar prova"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
