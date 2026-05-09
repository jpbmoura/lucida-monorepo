"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
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
import { CursoFormDialog } from "@/features/app/cursos/curso-form-dialog";
import { createCursoAction } from "@/features/app/cursos/actions";
import type { CursoDTO } from "@/features/app/cursos/types";
import type { TurmaDTO } from "./types";

const turmaSchema = z.object({
  name: z.string().min(2, "Dê um nome com ao menos 2 caracteres."),
  description: z.string().max(200, "Máximo de 200 caracteres.").optional(),
  courseId: z.string().min(1, "Selecione um curso."),
});

export type TurmaFormValues = z.infer<typeof turmaSchema>;

interface TurmaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  turma?: TurmaDTO | null;
  /**
   * Lista de cursos do professor — preenche o select. Pode ser vazia
   * quando `lockedCourseId` está setado (não é renderizada).
   */
  cursos: CursoDTO[];
  /**
   * Quando setado, o select de curso é escondido e esse id é fixado no
   * form. Use no contexto do detalhe do curso, onde criar/editar turma
   * fora do curso atual não faz sentido.
   */
  lockedCourseId?: string | null;
  /** Curso default pra preencher no modo create (ignorado se lockedCourseId). */
  defaultCursoId?: string | null;
  onSubmit: (
    values: TurmaFormValues,
  ) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Callback chamado quando um novo curso é criado pelo botão inline —
   * permite o pai recarregar a lista. Ignorado quando lockedCourseId está
   * setado (não há botão "+ novo curso" nesse modo).
   */
  onCursoCreated?: () => void;
}

export function TurmaFormDialog({
  open,
  onOpenChange,
  mode,
  turma,
  cursos,
  lockedCourseId,
  defaultCursoId,
  onSubmit,
  onCursoCreated,
}: TurmaFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [cursoDialogOpen, setCursoDialogOpen] = useState(false);
  const [availableCursos, setAvailableCursos] = useState<CursoDTO[]>(cursos);

  useEffect(() => {
    setAvailableCursos(cursos);
  }, [cursos]);

  const form = useForm<TurmaFormValues>({
    resolver: zodResolver(turmaSchema),
    defaultValues: { name: "", description: "", courseId: "" },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({
      name: turma?.name ?? "",
      description: turma?.description ?? "",
      courseId:
        lockedCourseId ??
        turma?.courseId ??
        defaultCursoId ??
        availableCursos[0]?.id ??
        "",
    });
  }, [open, turma, lockedCourseId, defaultCursoId, availableCursos, form]);

  async function handleSubmit(values: TurmaFormValues) {
    setServerError(null);
    const result = await onSubmit(values);
    if (!result.ok) {
      setServerError(result.error ?? "Não foi possível salvar a turma.");
      return;
    }
    onOpenChange(false);
  }

  async function handleCursoCreate(values: { name: string; description?: string }) {
    const result = await createCursoAction(values);
    if (result.ok && result.data) {
      const newCurso: CursoDTO = {
        id: result.data.id,
        name: result.data.name,
        description: values.description ?? "",
        classCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAvailableCursos((prev) => [newCurso, ...prev]);
      form.setValue("courseId", newCurso.id, { shouldValidate: true });
      onCursoCreated?.();
    }
    return { ok: result.ok, error: result.error?.message };
  }

  const isEdit = mode === "edit";
  const showCourseSelect = !lockedCourseId;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar turma" : "Nova turma"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? showCourseSelect
                  ? "Ajuste o nome, descrição ou mova pra outro curso. Alunos e provas vão junto."
                  : "Ajuste o nome ou a descrição."
                : "Crie uma turma vazia. Você adiciona alunos e provas depois."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            {showCourseSelect && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="turma-curso">Curso</Label>
                  <button
                    type="button"
                    onClick={() => setCursoDialogOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
                  >
                    <Plus className="size-3" strokeWidth={2.5} />
                    Novo curso
                  </button>
                </div>
                <Controller
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <select
                      id="turma-curso"
                      value={field.value}
                      onChange={field.onChange}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-ink transition-colors hover:border-gray-300 focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15"
                      aria-invalid={
                        form.formState.errors.courseId ? true : undefined
                      }
                    >
                      <option value="" disabled>
                        Selecione um curso...
                      </option>
                      {availableCursos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {form.formState.errors.courseId && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.courseId.message}
                  </p>
                )}
              </div>
            )}

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
                <p className="text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
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
                    : "Criar turma"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showCourseSelect && (
        <CursoFormDialog
          open={cursoDialogOpen}
          onOpenChange={setCursoDialogOpen}
          mode="create"
          onSubmit={handleCursoCreate}
        />
      )}
    </>
  );
}
