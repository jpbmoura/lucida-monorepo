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
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["member", "admin"]),
});

type InviteValues = z.infer<typeof inviteSchema>;

interface InviteTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Convida alguém pra instituição via `authClient.organization.inviteMember`.
 * O convidado escolhe entre "Professor" (member) e "Administrador" (admin) —
 * admin ganha acesso ao painel /analytics e pode gerenciar membros e
 * cobrança. Após sucesso, dispara `router.refresh()` pra re-buscar a lista
 * no server component pai.
 */
export function InviteTeacherDialog({ open, onOpenChange }: InviteTeacherDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({ email: "", role: "member" });
  }, [open, form]);

  async function onSubmit(values: InviteValues) {
    setServerError(null);
    const res = await authClient.organization.inviteMember({
      email: values.email,
      role: values.role,
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

  const selectedRole = form.watch("role");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-analytics-primary/10 text-analytics-primary">
              <UserPlus className="size-4" />
            </span>
            Convidar para a instituição
          </DialogTitle>
          <DialogDescription>
            O convidado recebe um e-mail com o link de aceite. Ao aceitar, ele
            entra na instituição com a função escolhida.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              placeholder="contato@escola.com.br"
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

          <fieldset className="flex flex-col gap-2">
            <Label>Função</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    value: "member",
                    label: "Professor",
                    hint: "Cria turmas, provas e acessa só os próprios dados.",
                  },
                  {
                    value: "admin",
                    label: "Administrador",
                    hint: "Vê o painel da instituição, gerencia membros e cobrança.",
                  },
                ] as const
              ).map((opt) => {
                const selected = selectedRole === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      form.setValue("role", opt.value, {
                        shouldValidate: true,
                      })
                    }
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-analytics-primary bg-analytics-primary/5"
                        : "border-gray-100 bg-white hover:border-gray-200",
                    )}
                  >
                    <div className="text-sm font-medium text-ink">
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

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
