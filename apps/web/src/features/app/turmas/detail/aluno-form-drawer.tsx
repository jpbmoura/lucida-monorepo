"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAlunoAction, updateAlunoAction } from "../actions";
import type { AlunoDTO } from "../types";

const alunoSchema = z.object({
  name: z.string().min(2, "Nome precisa ter ao menos 2 caracteres."),
  matricula: z.string().min(1, "Matrícula é obrigatória.").max(40, "Máximo de 40 caracteres."),
  email: z
    .string()
    .email("E-mail inválido.")
    .or(z.literal(""))
    .optional(),
});

type AlunoFormValues = z.infer<typeof alunoSchema>;

interface AlunoFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
  aluno?: AlunoDTO | null;
}

export function AlunoFormDrawer({ open, onOpenChange, turmaId, aluno }: AlunoFormDrawerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AlunoFormValues>({
    resolver: zodResolver(alunoSchema),
    defaultValues: { name: "", matricula: "", email: "" },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({
      name: aluno?.name ?? "",
      matricula: aluno?.matricula ?? "",
      email: aluno?.email ?? "",
    });
  }, [open, aluno, form]);

  async function handleSubmit(values: AlunoFormValues) {
    setServerError(null);
    const payload = {
      name: values.name,
      matricula: values.matricula,
      email: values.email && values.email.length > 0 ? values.email : null,
    };
    const result = aluno
      ? await updateAlunoAction(turmaId, aluno.id, payload)
      : await createAlunoAction(turmaId, payload);

    if (!result.ok) {
      setServerError(result.error?.message ?? "Não foi possível salvar o aluno.");
      return;
    }
    startTransition(() => router.refresh());
    onOpenChange(false);
  }

  const isEdit = Boolean(aluno);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar aluno" : "Novo aluno"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Ajuste os dados do aluno. O código de OMR não muda."
              : "Cadastre um aluno. O código de 7 dígitos é gerado automaticamente."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-1 flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="aluno-name">Nome</Label>
            <Input
              id="aluno-name"
              placeholder="Nome completo"
              autoFocus
              aria-invalid={form.formState.errors.name ? true : undefined}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="aluno-matricula">Matrícula</Label>
            <Input
              id="aluno-matricula"
              placeholder="Número da matrícula"
              aria-invalid={form.formState.errors.matricula ? true : undefined}
              {...form.register("matricula")}
            />
            {form.formState.errors.matricula && (
              <p className="text-xs text-red-600">{form.formState.errors.matricula.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="aluno-email">E-mail (opcional)</Label>
            <Input
              id="aluno-email"
              type="email"
              placeholder="aluno@escola.com"
              aria-invalid={form.formState.errors.email ? true : undefined}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          {isEdit && aluno && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
              Código OMR: <strong className="text-ink tabular-nums">{aluno.code}</strong>
            </div>
          )}

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <SheetFooter>
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : isEdit ? "Salvar" : "Adicionar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
