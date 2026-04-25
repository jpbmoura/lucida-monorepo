"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteAlunoAction } from "../actions";
import type { AlunoDTO } from "../types";

interface DeleteAlunoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
  aluno: AlunoDTO | null;
}

export function DeleteAlunoDialog({
  open,
  onOpenChange,
  turmaId,
  aluno,
}: DeleteAlunoDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!aluno) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteAlunoAction(turmaId, aluno.id);
      if (!result.ok) {
        setError(result.error?.message ?? "Não foi possível remover.");
        return;
      }
      startTransition(() => router.refresh());
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
          <DialogTitle>Remover aluno?</DialogTitle>
          <DialogDescription>
            {aluno ? (
              <>
                Tem certeza que quer remover{" "}
                <strong className="text-ink">{aluno.name}</strong> da turma? As submissões e
                resultados deste aluno deixam de aparecer nas análises.
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
            {busy ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
