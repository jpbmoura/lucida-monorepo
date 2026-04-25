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

interface CancelInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}

export function CancelInvitationDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
}: CancelInvitationDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error ?? "Não foi possível cancelar.");
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
          <DialogTitle>Cancelar convite?</DialogTitle>
          <DialogDescription>
            Tem certeza que quer cancelar o convite para{" "}
            <strong className="text-ink">{email}</strong>?
            <br />
            O link do e-mail deixa de funcionar. Você pode enviar um novo
            convite a qualquer momento.
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
            Voltar
          </Button>
          <Button
            type="button"
            size="md"
            onClick={handleConfirm}
            disabled={busy}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {busy ? "Cancelando..." : "Cancelar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
