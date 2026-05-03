"use client";

import { useState, useTransition } from "react";
import { UserCog } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { startKintalImpersonateAction } from "../actions";

interface KintalImpersonateButtonProps {
  targetUserId: string;
  targetName: string;
  /** True quando a linha é do próprio staff logado — desativa pra evitar
   *  auto-impersonate (o backend bloqueia, mas é melhor não oferecer). */
  disabled?: boolean;
}

/**
 * Botão "Atuar como" exibido no detalhe do user (Kintal). Abre dialog de
 * confirmação porque é uma ação com consequências — toda ação que o staff
 * tomar enquanto impersonando ficará registrada como sendo do user.
 *
 * Em sucesso, server action redireciona pro `/app` — não precisamos
 * manipular navigation aqui. Pra encerrar, o `ImpersonateBanner` no topo
 * do `/app` cuida do stop (já existe).
 */
export function KintalImpersonateButton({
  targetUserId,
  targetName,
  disabled,
}: KintalImpersonateButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await startKintalImpersonateAction(targetUserId);
      if (!res?.ok) {
        setError(res?.error ?? "Não foi possível iniciar.");
      }
      // Sucesso → action fez redirect, não retorna pra cá.
    });
  }

  if (disabled) {
    return (
      <Button
        type="button"
        variant="outline"
        size="md"
        disabled
        title="Você não pode atuar como você mesmo."
      >
        <UserCog className="size-4" />
        Atuar como
      </Button>
    );
  }

  const firstName = targetName.split(" ")[0] ?? targetName;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => setOpen(true)}
      >
        <UserCog className="size-4" />
        Atuar como
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atuar como {targetName}?</DialogTitle>
            <DialogDescription>
              Você vai navegar no Lucida como{" "}
              <strong className="text-ink">{targetName}</strong> com acesso
              total à conta. Toda ação realizada (criar/editar prova,
              consumir crédito, abrir billing) ficará atribuída a ele e
              registrada em audit log com o seu staff id. Use somente pra
              suporte com consentimento.
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
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? "Iniciando..." : `Atuar como ${firstName}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
