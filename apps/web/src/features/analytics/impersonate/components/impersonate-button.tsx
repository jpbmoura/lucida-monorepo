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
import { startImpersonateAction } from "../actions";

interface ImpersonateButtonProps {
  teacherId: string;
  teacherName: string;
}

/**
 * Botão "Atuar como [Nome]" no drill-down do professor. Abre dialog de
 * confirmação porque é uma ação com consequências (ledger marca como
 * teacher, edits também). Em sucesso, o server action redireciona pro
 * /app — não precisamos manipular navigation aqui.
 */
export function ImpersonateButton({
  teacherId,
  teacherName,
}: ImpersonateButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await startImpersonateAction(teacherId);
      if (!res?.ok) {
        setError(res?.error ?? "Não foi possível iniciar.");
      }
      // Em sucesso, server action chamou redirect e não retorna pra cá.
    });
  }

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
            <DialogTitle>Atuar como {teacherName}?</DialogTitle>
            <DialogDescription>
              Você vai navegar no Lucida Exam como se fosse{" "}
              <strong className="text-ink">{teacherName}</strong>. Toda ação que
              fizer (criar/editar prova, adicionar aluno, etc) ficará registrada
              em auditoria como sua, mas atribuída a ele. Use pra ajudar — nunca
              pra mudar conteúdo sem consentimento.
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
              {pending ? "Iniciando..." : "Atuar como " + teacherName.split(" ")[0]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
