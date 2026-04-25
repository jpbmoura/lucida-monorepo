"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { rotateWebhookSecretAction } from "../actions";
import { SecretRevealPanel } from "./secret-reveal-panel";

interface RotateWebhookSecretButtonProps {
  endpointId: string;
  endpointUrl: string;
}

/**
 * Rotaciona o signing secret. Fluxo em 3 fases no mesmo dialog:
 *   - confirm: aviso que o parceiro precisa atualizar do lado dele
 *   - (loading enquanto a action roda)
 *   - reveal: mostra o secret novo uma única vez
 *
 * Fase C (quando os disparos estiverem ligados): após rotate, novos
 * disparos já vão assinar com o secret novo. Breve janela de quebra se
 * o parceiro não atualizar — esperado.
 */
export function RotateWebhookSecretButton({
  endpointId,
  endpointUrl,
}: RotateWebhookSecretButtonProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"confirm" | "reveal">("confirm");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await rotateWebhookSecretAction(endpointId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSecret(res.data.signingSecret);
      setPhase("reveal");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhase("confirm");
    setSecret(null);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <RefreshCcw className="size-3.5" />
        Rotacionar secret
      </button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) reset();
          setOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {phase === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>Rotacionar signing secret?</DialogTitle>
                <DialogDescription>
                  Um novo secret será gerado para{" "}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">
                    {endpointUrl}
                  </code>
                  . Disparos futuros serão assinados com o secret novo —
                  se o parceiro não atualizar do lado dele, as
                  verificações vão falhar até sincronizarem. O secret
                  antigo para de funcionar imediatamente.
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
                  variant="primary"
                  size="md"
                  onClick={handleConfirm}
                  disabled={busy}
                >
                  {busy ? "Rotacionando..." : "Rotacionar"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Novo secret</DialogTitle>
                <DialogDescription>
                  Atualize o valor no backend do parceiro antes de
                  fechar. Depois disso, não será exibido de novo.
                </DialogDescription>
              </DialogHeader>

              {secret && (
                <SecretRevealPanel label="Signing secret" secret={secret} />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setOpen(false)}
                >
                  Já atualizei
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
