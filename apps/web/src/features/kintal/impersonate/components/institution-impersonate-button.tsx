"use client";

import { useState, useTransition } from "react";
import { Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { startInstitutionImpersonateAction } from "../actions";

interface InstitutionImpersonateButtonProps {
  organizationId: string;
  institutionName: string;
  ownerName: string | null;
  /** Quando a org não tem owner cadastrado, o botão fica desativado. */
  disabled?: boolean;
}

/**
 * Botão "Atuar como instituição" no detalhe da org no Kintal. Backend
 * resolve o owner da org e dispara o impersonate normal — staff navega
 * em `/app` e `/analytics` com permissões de owner.
 */
export function InstitutionImpersonateButton({
  organizationId,
  institutionName,
  ownerName,
  disabled,
}: InstitutionImpersonateButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await startInstitutionImpersonateAction(organizationId);
      if (!res?.ok) {
        setError(res?.error ?? "Não foi possível iniciar.");
      }
    });
  }

  if (disabled) {
    return (
      <Button
        type="button"
        variant="outline"
        size="md"
        disabled
        title="Instituição sem owner. Promova alguém antes de atuar como."
      >
        <Building2 className="size-4" />
        Atuar como instituição
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => setOpen(true)}
      >
        <Building2 className="size-4" />
        Atuar como instituição
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atuar como {institutionName}?</DialogTitle>
            <DialogDescription>
              Você vai navegar como o owner da instituição
              {ownerName ? (
                <>
                  {" "}
                  (<strong className="text-ink">{ownerName}</strong>)
                </>
              ) : null}
              , com acesso total à conta dele e à área de administração da
              instituição. Toda ação ficará atribuída a esse usuário e
              registrada em audit log com o seu staff id.
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
              {pending ? "Iniciando..." : "Atuar como instituição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
