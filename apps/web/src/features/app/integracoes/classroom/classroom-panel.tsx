"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleClassroomLogo } from "../components/integration-logos";
import { ImportDialog, type ImportFormValues } from "./import-dialog";
import {
  importClassroomCourseAction,
  reconcileClassroomAction,
} from "../actions";
import type { ClassroomCourseDTO, ReconciliationReportDTO } from "../types";

interface ClassroomPanelProps {
  googleEmail: string | null;
  initialCourses: ClassroomCourseDTO[];
  lucidaCourses: { id: string; name: string }[];
}

function summarize(report: ReconciliationReportDTO): string {
  const parts = [
    `${report.imported} importado${report.imported === 1 ? "" : "s"}`,
    `${report.alreadyExisted} já existia${report.alreadyExisted === 1 ? "" : "m"}`,
    `${report.departed} saiu${report.departed === 1 ? "" : "ram"}`,
  ];
  if (report.skippedNoEmail > 0) {
    parts.push(`${report.skippedNoEmail} sem e-mail`);
  }
  return parts.join(", ");
}

export function ClassroomPanel({
  googleEmail,
  initialCourses,
  lucidaCourses,
}: ClassroomPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [importTarget, setImportTarget] = useState<ClassroomCourseDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ courseId: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(values: ImportFormValues) {
    if (!importTarget) return { ok: false, error: "Sem turma selecionada." };
    const result = await importClassroomCourseAction(
      importTarget.classroomCourseId,
      values,
    );
    if (result.ok && result.data) {
      setFeedback({
        courseId: importTarget.classroomCourseId,
        text: summarize(result.data.report),
      });
      startTransition(() => router.refresh());
    }
    return { ok: result.ok, error: result.error?.message };
  }

  async function handleReconcile(course: ClassroomCourseDTO) {
    if (!course.lucidaClassId) return;
    setError(null);
    setBusyId(course.classroomCourseId);
    const result = await reconcileClassroomAction(course.lucidaClassId);
    setBusyId(null);
    if (result.ok && result.data) {
      setFeedback({
        courseId: course.classroomCourseId,
        text: summarize(result.data),
      });
      startTransition(() => router.refresh());
    } else {
      setError(result.error?.message ?? "Não foi possível atualizar os alunos.");
    }
  }

  return (
    <>
      <Link
        href="/app/integracoes"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Integrações
      </Link>

      <div className="border-b border-gray-100 pb-8">
        <div className="flex items-center gap-3">
          <GoogleClassroomLogo className="size-10 shrink-0" />
          <div>
            <h1 className="text-3xl font-medium tracking-tighter text-ink md:text-4xl">
              Google Classroom
            </h1>
            {googleEmail && (
              <p className="text-sm text-gray-500">{googleEmail}</p>
            )}
          </div>
        </div>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-500">
          Importe turmas seletivamente. Você pode importar agora e voltar
          depois — o casamento de alunos é por e-mail, então reimportar nunca
          duplica.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {initialCourses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center text-sm text-gray-500">
          Nenhuma turma ativa encontrada no seu Google Classroom.
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {initialCourses.map((course) => (
            <li
              key={course.classroomCourseId}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[15px] font-medium text-ink">
                    {course.name}
                  </h3>
                  {course.imported && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                      <Check className="size-3" />
                      importada
                    </span>
                  )}
                </div>
                {course.section && (
                  <p className="truncate text-sm text-gray-400">
                    {course.section}
                  </p>
                )}
                {feedback?.courseId === course.classroomCourseId && (
                  <p className="mt-1 text-xs text-emerald-600">{feedback.text}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {course.imported ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReconcile(course)}
                      disabled={busyId === course.classroomCourseId}
                    >
                      <RefreshCw className="size-4" />
                      {busyId === course.classroomCourseId
                        ? "Atualizando..."
                        : "Importar alunos do Classroom"}
                    </Button>
                    {course.lucidaClassId && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/app/turmas/${course.lucidaClassId}`}>
                          Ver turma
                        </Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setImportTarget(course)}
                  >
                    Importar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ImportDialog
        open={importTarget !== null}
        onOpenChange={(o) => !o && setImportTarget(null)}
        course={importTarget}
        lucidaCourses={lucidaCourses}
        onSubmit={handleImport}
      />
    </>
  );
}
