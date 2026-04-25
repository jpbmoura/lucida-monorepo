"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type InviteValues = z.infer<typeof inviteSchema>;

interface InviteTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Convida um professor via `authClient.organization.inviteMember`. O role é
 * fixo em "member" no MVP — admin/owner ficam pra depois. Após sucesso,
 * dispara `router.refresh()` pra o server component pai re-buscar a lista.
 */
export function InviteTeacherDialog({ open, onOpenChange }: InviteTeacherDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({ email: "" });
  }, [open, form]);

  async function onSubmit(values: InviteValues) {
    setServerError(null);
    const res = await authClient.organization.inviteMember({
      email: values.email,
      role: "member",
    });
    if (res.error) {
      setServerError(
        res.error.message ??
          "Não foi possível enviar o convite. Verifique o e-mail.",
      );
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-analytics-primary/10 text-analytics-primary">
              <UserPlus className="size-4" />
            </span>
            Convidar professor
          </DialogTitle>
          <DialogDescription>
            O professor recebe um e-mail com o link de aceite. Ao aceitar, ele
            entra na instituição e passa a aparecer aqui.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">E-mail do professor</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              placeholder="professor@escola.com.br"
              autoFocus
              aria-invalid={form.formState.errors.email ? true : undefined}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
