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

interface DeleteExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examTitle: string;
  questionCount: number;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}

export function DeleteExamDialog({
  open,
  onOpenChange,
  examTitle,
  questionCount,
  onConfirm,
}: DeleteExamDialogProps) {
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
          <DialogTitle>Excluir prova?</DialogTitle>
          <DialogDescription>
            Tem certeza que quer excluir <strong className="text-ink">{examTitle}</strong>?
            Isso remove a prova e suas {questionCount}{" "}
            {questionCount === 1 ? "questão" : "questões"}. Submissões vinculadas (quando
            existirem) também são perdidas. Esta ação não pode ser desfeita.
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
            {busy ? "Excluindo..." : "Excluir prova"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
