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
import type { CursoDTO } from "./types";

interface DeleteCursoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: CursoDTO | null;
  onConfirm: () => Promise<{ ok: boolean; error?: string; code?: string }>;
}

export function DeleteCursoDialog({
  open,
  onOpenChange,
  curso,
  onConfirm,
}: DeleteCursoDialogProps) {
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

  const hasClasses = (curso?.classCount ?? 0) > 0;

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
          <DialogTitle>
            {hasClasses ? "Curso ainda tem turmas" : "Excluir curso?"}
          </DialogTitle>
          <DialogDescription>
            {hasClasses ? (
              <>
                <strong className="text-ink">{curso?.name}</strong> tem{" "}
                <strong className="text-ink">
                  {curso?.classCount}{" "}
                  {curso?.classCount === 1 ? "turma" : "turmas"}
                </strong>{" "}
                dentro. Mova as turmas pra outro curso ou exclua-as antes de
                excluir o curso.
              </>
            ) : curso ? (
              <>
                Tem certeza que quer excluir{" "}
                <strong className="text-ink">{curso.name}</strong>? Esta ação
                não pode ser desfeita.
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
            {hasClasses ? "Fechar" : "Cancelar"}
          </Button>
          {!hasClasses && (
            <Button
              type="button"
              size="md"
              onClick={handleConfirm}
              disabled={busy}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {busy ? "Excluindo..." : "Excluir curso"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
