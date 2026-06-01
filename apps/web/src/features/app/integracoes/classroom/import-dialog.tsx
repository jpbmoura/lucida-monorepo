"use client";

import { useEffect, useState } from "react";
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
import type { ClassroomCourseDTO } from "../types";

export interface ImportFormValues {
  className: string;
  courseId?: string;
  newCourseName?: string;
}

interface LucidaCourseOption {
  id: string;
  name: string;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: ClassroomCourseDTO | null;
  lucidaCourses: LucidaCourseOption[];
  onSubmit: (values: ImportFormValues) => Promise<{ ok: boolean; error?: string }>;
}

/** Sugere o nome da turma a partir do nome + seção do Classroom. */
function suggestClassName(course: ClassroomCourseDTO | null): string {
  if (!course) return "";
  return course.section ? `${course.name} — ${course.section}` : course.name;
}

export function ImportDialog({
  open,
  onOpenChange,
  course,
  lucidaCourses,
  onSubmit,
}: ImportDialogProps) {
  const hasCourses = lucidaCourses.length > 0;
  const [className, setClassName] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [courseId, setCourseId] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const suggested = suggestClassName(course);
    setClassName(suggested);
    setMode(hasCourses ? "existing" : "new");
    setCourseId(hasCourses ? lucidaCourses[0]!.id : "");
    setNewCourseName(course?.name ?? "");
    setError(null);
  }, [open, course, hasCourses, lucidaCourses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (className.trim().length < 2) {
      setError("Dê um nome de turma com ao menos 2 caracteres.");
      return;
    }
    const values: ImportFormValues =
      mode === "existing"
        ? { className: className.trim(), courseId }
        : { className: className.trim(), newCourseName: newCourseName.trim() };

    if (mode === "existing" && !courseId) {
      setError("Selecione um curso.");
      return;
    }
    if (mode === "new" && values.newCourseName!.length < 2) {
      setError("Dê um nome de curso com ao menos 2 caracteres.");
      return;
    }

    setBusy(true);
    const result = await onSubmit(values);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível importar a turma.");
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar turma do Classroom</DialogTitle>
          <DialogDescription>
            Toda turma precisa de um curso. Escolha um existente ou crie um novo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-class-name">Nome da turma na Lucida</Label>
            <Input
              id="import-class-name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium text-ink">Curso</legend>

            {hasCourses && (
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="radio"
                  name="course-mode"
                  checked={mode === "existing"}
                  onChange={() => setMode("existing")}
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="text-ink">Usar um curso existente</span>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    onFocus={() => setMode("existing")}
                    disabled={mode !== "existing"}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-ink disabled:opacity-50"
                  >
                    {lucidaCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            )}

            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="radio"
                name="course-mode"
                checked={mode === "new"}
                onChange={() => setMode("new")}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="text-ink">Criar um novo curso</span>
                <Input
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  onFocus={() => setMode("new")}
                  disabled={mode !== "new"}
                  maxLength={120}
                  placeholder="Nome do novo curso"
                  className="mt-2 disabled:opacity-50"
                />
              </span>
            </label>
          </fieldset>

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
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={busy}>
              {busy ? "Importando..." : "Importar turma"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
