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

interface RevokeMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberEmail: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}

export function RevokeMemberDialog({
  open,
  onOpenChange,
  memberName,
  memberEmail,
  onConfirm,
}: RevokeMemberDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error ?? "Não foi possível revogar.");
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
          <DialogTitle>Revogar acesso?</DialogTitle>
          <DialogDescription>
            Tem certeza que quer revogar o acesso de{" "}
            <strong className="text-ink">{memberName}</strong>{" "}
            <span className="text-gray-400">({memberEmail})</span>?
            <br />
            Ele deixa de aparecer no painel da instituição e volta a ser um
            professor avulso. Turmas, provas e alunos continuam com ele.
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
            {busy ? "Revogando..." : "Revogar acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
