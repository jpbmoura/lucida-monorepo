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
import { deleteWebhookEndpointAction } from "../actions";

interface DeleteWebhookEndpointButtonProps {
  endpointId: string;
  endpointUrl: string;
}

export function DeleteWebhookEndpointButton({
  endpointId,
  endpointUrl,
}: DeleteWebhookEndpointButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await deleteWebhookEndpointAction(endpointId);
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
        Remover
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
            <DialogTitle>Remover endpoint?</DialogTitle>
            <DialogDescription>
              O endpoint{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">
                {endpointUrl}
              </code>{" "}
              para de receber disparos imediatamente. Se quiser só pausar
              sem deletar, use "Editar" e desmarque "Endpoint ativo".
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
              {busy ? "Removendo..." : "Remover endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
