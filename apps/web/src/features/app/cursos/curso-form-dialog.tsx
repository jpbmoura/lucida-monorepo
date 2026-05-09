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
import type { CursoDTO } from "./types";

const cursoSchema = z.object({
  name: z.string().min(2, "Dê um nome com ao menos 2 caracteres."),
  description: z.string().max(200, "Máximo de 200 caracteres.").optional(),
});

export type CursoFormValues = z.infer<typeof cursoSchema>;

interface CursoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  curso?: CursoDTO | null;
  onSubmit: (values: CursoFormValues) => Promise<{ ok: boolean; error?: string }>;
}

export function CursoFormDialog({
  open,
  onOpenChange,
  mode,
  curso,
  onSubmit,
}: CursoFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CursoFormValues>({
    resolver: zodResolver(cursoSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({
      name: curso?.name ?? "",
      description: curso?.description ?? "",
    });
  }, [open, curso, form]);

  async function handleSubmit(values: CursoFormValues) {
    setServerError(null);
    const result = await onSubmit(values);
    if (!result.ok) {
      setServerError(result.error ?? "Não foi possível salvar o curso.");
      return;
    }
    onOpenChange(false);
  }

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar curso" : "Novo curso"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Renomeie ou ajuste a descrição. As turmas dentro continuam intactas."
              : "Cursos são agrupadores livres. Use pra separar instituições, séries, projetos — como fizer mais sentido pra você."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="curso-name">Nome</Label>
            <Input
              id="curso-name"
              placeholder="Ex: Colégio São Paulo, Matemática 9º, Cursinho..."
              autoFocus
              aria-invalid={form.formState.errors.name ? true : undefined}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="curso-description">Descrição</Label>
            <Textarea
              id="curso-description"
              placeholder="Opcional. Ex: instituição, semestre, observações..."
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-red-600">
                {form.formState.errors.description.message}
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
              {form.formState.isSubmitting
                ? "Salvando..."
                : isEdit
                  ? "Salvar"
                  : "Criar curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
