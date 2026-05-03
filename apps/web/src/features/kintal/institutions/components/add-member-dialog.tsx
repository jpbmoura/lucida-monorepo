"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addInstitutionMemberAction } from "../data";

const SCHEMA = z.object({
  userEmail: z.string().trim().email("Email inválido."),
  userName: z.string().trim().max(200).optional().or(z.literal("")),
  password: z
    .string()
    .max(200)
    .refine((v) => !v || v.length >= 8, {
      message: "Mínimo de 8 caracteres.",
    })
    .optional()
    .or(z.literal("")),
  role: z.enum(["member", "admin"]),
});

type FormValues = z.infer<typeof SCHEMA>;

interface Props {
  orgId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function AddMemberDialog({ orgId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMA),
    defaultValues: {
      userEmail: "",
      userName: "",
      password: "",
      role: "member",
    },
  });

  async function handleSubmit(values: FormValues) {
    setServerError(null);
    const res = await addInstitutionMemberAction(orgId, {
      userEmail: values.userEmail.toLowerCase(),
      userName: values.userName || undefined,
      password: values.password || undefined,
      role: values.role,
    });
    if (!res.ok) {
      setServerError(res.message);
      return;
    }
    onOpenChange(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          form.reset();
          setServerError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar professor</DialogTitle>
          <DialogDescription>
            Vincula o usuário à instituição direto, sem envio de convite por
            email. Se o email não tiver cadastro, criamos um usuário novo
            usando o nome e a senha informados.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field
            label="Email"
            error={form.formState.errors.userEmail?.message}
          >
            <Input
              type="email"
              placeholder="contato@exemplo.com"
              autoComplete="off"
              {...form.register("userEmail")}
            />
          </Field>

          <Field
            label="Nome (apenas se for cadastro novo)"
            hint="Ignorado se o email já existe."
            error={form.formState.errors.userName?.message}
          >
            <Input
              placeholder="Nome completo"
              autoComplete="off"
              {...form.register("userName")}
            />
          </Field>

          <Field
            label="Senha (apenas se for cadastro novo)"
            hint="Mínimo de 8 caracteres. Ignorada se o email já existe."
            error={form.formState.errors.password?.message}
          >
            <Input
              type="text"
              placeholder="••••••••"
              autoComplete="off"
              {...form.register("password")}
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <Label>Função</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "member", label: "Professor", hint: "Acesso padrão." },
                  {
                    value: "admin",
                    label: "Administrador",
                    hint: "Gere a instituição e os professores.",
                  },
                ] as const
              ).map((opt) => {
                const selected = form.watch("role") === opt.value;
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
                        ? "border-brand-primary bg-brand-primary/5"
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
              disabled={form.formState.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                "Adicionar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-500">{hint}</p>}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
