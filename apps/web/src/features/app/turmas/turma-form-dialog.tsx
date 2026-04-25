"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import type { TurmaDTO } from "./types";

const turmaSchema = z.object({
  name: z.string().min(2, "Dê um nome com ao menos 2 caracteres."),
  description: z.string().max(200, "Máximo de 200 caracteres.").optional(),
});

export type TurmaFormValues = z.infer<typeof turmaSchema>;

interface TurmaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  turma?: TurmaDTO | null;
  onSubmit: (values: TurmaFormValues) => Promise<{ ok: boolean; error?: string }>;
}

export function TurmaFormDialog({
  open,
  onOpenChange,
  mode,
  turma,
  onSubmit,
}: TurmaFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TurmaFormValues>({
    resolver: zodResolver(turmaSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({
      name: turma?.name ?? "",
      description: turma?.description ?? "",
    });
  }, [open, turma, form]);

  async function handleSubmit(values: TurmaFormValues) {
    setServerError(null);
    const result = await onSubmit(values);
    if (!result.ok) {
      setServerError(result.error ?? "Não foi possível salvar a turma.");
      return;
    }
    onOpenChange(false);
  }

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar turma" : "Nova turma"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste o nome e a descrição. Alunos e provas ficam intactos."
              : "Crie uma turma vazia. Você adiciona alunos e provas depois."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="turma-name">Nome</Label>
            <Input
              id="turma-name"
              placeholder="Ex: 9º Ano A — Matemática"
              autoFocus
              aria-invalid={form.formState.errors.name ? true : undefined}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="turma-description">Descrição</Label>
            <Textarea
              id="turma-description"
              placeholder="Turno, ano letivo, etc."
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-red-600">{form.formState.errors.description.message}</p>
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
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : isEdit ? "Salvar" : "Criar turma"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
