"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, Pencil, Plus, Users, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { TurmaFormDialog, type TurmaFormValues } from "../turma-form-dialog";
import { DeleteTurmaDialog } from "../delete-turma-dialog";
import { updateTurmaAction, deleteTurmaAction } from "../actions";
import { deriveTurmaInitials } from "../utils";
import type { CursoDTO } from "@/features/app/cursos/types";
import type { TurmaDTO, TurmaExamDTO, AlunoDTO } from "../types";
import { TabsSwitcher, type TurmaTab } from "./tabs-switcher";
import { ProvasTab } from "./provas-tab";
import { AlunosTab } from "./alunos-tab";

interface TurmaDetailProps {
  initialTurma: TurmaDTO;
  exams: TurmaExamDTO[];
  alunos: AlunoDTO[];
  cursos: CursoDTO[];
}

export function TurmaDetail({
  initialTurma,
  exams,
  alunos,
  cursos,
}: TurmaDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: TurmaTab = (searchParams.get("tab") as TurmaTab | null) ?? "provas";
  const [, startTransition] = useTransition();

  const turma = initialTurma;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Curso pai pra link de voltar — usa courseName hidratado pelo backend
  // se disponível, ou cai pro nome encontrado em `cursos` como fallback.
  const courseHref = `/app/cursos/${turma.courseId}`;
  const courseLabel =
    turma.courseName ??
    cursos.find((c) => c.id === turma.courseId)?.name ??
    "Curso";

  async function handleEdit(values: TurmaFormValues) {
    const result = await updateTurmaAction(turma.id, values);
    if (result.ok) startTransition(() => router.refresh());
    return { ok: result.ok, error: result.error?.message };
  }

  async function handleDelete() {
    const result = await deleteTurmaAction(turma.id);
    if (result.ok) {
      startTransition(() => {
        router.push(courseHref);
        router.refresh();
      });
    }
    return { ok: result.ok, error: result.error?.message };
  }

  return (
    <>
      <Link
        href={courseHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        {courseLabel}
      </Link>

      <header className="mt-4 flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-primary text-lg font-semibold text-white">
            {deriveTurmaInitials(turma.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
              {turma.name}
            </h1>
            {turma.description && (
              <p className="mt-2 max-w-2xl text-[15px] text-gray-500">{turma.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Stat icon={<Users className="size-3.5" />} label={`${turma.studentsCount} alunos`} />
              <Dot />
              <Stat
                icon={<FileText className="size-3.5" />}
                label={`${turma.examsCount} provas`}
              />
              {turma.activeExamsCount > 0 && (
                <>
                  <Dot />
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-0.5 font-medium text-brand-primary">
                    {turma.activeExamsCount} ativas
                  </span>
                </>
              )}
              <Dot />
              <Stat
                icon={<Clock className="size-3.5" />}
                label={`atualizada ${formatRelativeTime(turma.lastActivityAt, "há pouco")}`}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="md">
            <Link href={`/app/analises/turmas/${turma.id}`}>
              <BarChart3 className="size-4" />
              Análises
            </Link>
          </Button>
          <Button variant="outline" size="md" onClick={() => setDrawerOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button asChild variant="primary" size="md">
            <Link href={`/app/turmas/${turma.id}/provas/nova`}>
              <Plus className="size-4" strokeWidth={2.5} />
              Nova prova
            </Link>
          </Button>
        </div>
      </header>

      <div className="mt-8">
        <TabsSwitcher
          turmaId={turma.id}
          counts={{ provas: exams.length, alunos: alunos.length }}
        />
      </div>

      <div className={cn("mt-6", tab === "provas" && "hidden")} hidden={tab !== "alunos"}>
        <AlunosTab turmaId={turma.id} alunos={alunos} />
      </div>

      <div className={cn("mt-6", tab !== "provas" && "hidden")} hidden={tab === "alunos"}>
        <ProvasTab classId={turma.id} exams={exams} />
      </div>

      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="mt-16 text-xs text-gray-400 underline-offset-4 transition-colors hover:text-red-600 hover:underline"
      >
        Excluir turma
      </button>

      <TurmaFormDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        turma={turma}
        cursos={cursos}
        onSubmit={handleEdit}
        onCursoCreated={() => startTransition(() => router.refresh())}
      />

      <DeleteTurmaDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        turma={turma}
        onConfirm={handleDelete}
      />
    </>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {label}
    </span>
  );
}

function Dot() {
  return <span className="size-0.5 rounded-full bg-gray-300" />;
}
