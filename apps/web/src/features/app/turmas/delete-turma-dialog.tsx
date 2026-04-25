"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TurmaDTO } from "./types";

interface DeleteTurmaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma: TurmaDTO | null;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}

export function DeleteTurmaDialog({
  open,
  onOpenChange,
  turma,
  onConfirm,
}: DeleteTurmaDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error ?? "Não foi possível excluir.");
        return;
      }
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir turma?</DialogTitle>
          <DialogDescription>
            {turma ? (
              <>
                Tem certeza que quer excluir <strong className="text-ink">{turma.name}</strong>?
                Isso remove a turma junto com{" "}
                <strong className="text-ink">
                  {turma.examsCount} {turma.examsCount === 1 ? "prova" : "provas"}
                </strong>{" "}
                e{" "}
                <strong className="text-ink">
                  {turma.studentsCount} {turma.studentsCount === 1 ? "aluno" : "alunos"}
                </strong>{" "}
                vinculados. Esta ação não pode ser desfeita.
              </>
            ) : (
              "Esta ação não pode ser desfeita."
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            onClick={handleConfirm}
            disabled={busy}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {busy ? "Excluindo..." : "Excluir turma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
