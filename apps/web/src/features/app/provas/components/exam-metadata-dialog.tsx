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

const metadataSchema = z.object({
  title: z.string().min(2, "Título precisa ter ao menos 2 caracteres."),
  description: z.string().max(500, "Máximo de 500 caracteres.").optional(),
  duration: z
    .number({ invalid_type_error: "Informe um número." })
    .int()
    .min(0)
    .max(600, "Máximo de 600 minutos."),
});

export type ExamMetadataValues = z.infer<typeof metadataSchema>;

interface ExamMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { title: string; description: string; duration: number };
  onSubmit: (values: ExamMetadataValues) => Promise<{ ok: boolean; error?: string }>;
}

export function ExamMetadataDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: ExamMetadataDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ExamMetadataValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { title: "", description: "", duration: 0 },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({
      title: initial.title,
      description: initial.description,
      duration: initial.duration,
    });
  }, [open, initial, form]);

  async function handleSubmit(values: ExamMetadataValues) {
    setServerError(null);
    const result = await onSubmit(values);
    if (!result.ok) {
      setServerError(result.error ?? "Não foi possível salvar.");
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar informações da prova</DialogTitle>
          <DialogDescription>
            Título, descrição e duração. As questões são editadas na própria prova.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="exam-md-title">Título</Label>
            <Input
              id="exam-md-title"
              autoFocus
              aria-invalid={form.formState.errors.title ? true : undefined}
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exam-md-description">Descrição</Label>
            <Textarea id="exam-md-description" {...form.register("description")} />
            {form.formState.errors.description && (
              <p className="text-xs text-red-600">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exam-md-duration">Duração (minutos, 0 = sem limite)</Label>
            <Input
              id="exam-md-duration"
              type="number"
              min={0}
              max={600}
              aria-invalid={form.formState.errors.duration ? true : undefined}
              {...form.register("duration", { valueAsNumber: true })}
            />
            {form.formState.errors.duration && (
              <p className="text-xs text-red-600">
                {form.formState.errors.duration.message}
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
              {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
