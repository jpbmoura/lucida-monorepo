"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { revokeApiKeyAction } from "../actions";

interface RevokeApiKeyButtonProps {
  keyId: string;
  keyName: string;
  keyLastFour: string;
}

/**
 * Botão "Revogar" + dialog de confirmação. Revogação é imediata e
 * irreversível — depois dessa ação, qualquer request Bearer com a chave
 * ficará 401 (Fase B). Usamos texto vermelho no botão final pra
 * indicar destrutividade.
 */
export function RevokeApiKeyButton({
  keyId,
  keyName,
  keyLastFour,
}: RevokeApiKeyButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await revokeApiKeyAction(keyId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <Trash2 className="size-3.5" />
        Revogar
      </button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setError(null);
          setOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar chave?</DialogTitle>
            <DialogDescription>
              A chave{" "}
              <strong className="text-ink">{keyName}</strong>{" "}
              <span className="text-gray-400">(••••{keyLastFour})</span>{" "}
              vai parar de funcionar imediatamente. Requests Bearer com ela
              passarão a receber 401. Esta ação é irreversível — se
              precisar de uma nova, basta criar outra chave.
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
              onClick={() => setOpen(false)}
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
              {busy ? "Revogando..." : "Revogar chave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
