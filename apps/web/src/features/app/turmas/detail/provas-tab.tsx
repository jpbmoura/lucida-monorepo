"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Eye,
  FileDown,
  Link2,
  MoreHorizontal,
  Plus,
  FileText,
  ScanLine,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClickableCard, ClickableCardActions } from "@/components/ui/clickable-card";
import { cn } from "@/lib/utils";
import { deleteExamAction } from "@/features/app/provas/actions";
import { DeleteExamDialog } from "@/features/app/provas/components/delete-exam-dialog";
import { ExportExamDialog } from "@/features/app/provas/components/export-exam-dialog";
import type { TurmaExamDTO } from "../types";

interface ProvasTabProps {
  classId: string;
  exams: TurmaExamDTO[];
}

export function ProvasTab({ classId, exams }: ProvasTabProps) {
  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <FileText className="size-5" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-medium text-ink">
            Nenhuma prova por aqui
          </h3>
          <p className="max-w-sm text-sm text-gray-500">
            Crie a primeira prova pra começar a avaliar a turma. A Lulu ajuda a
            gerar as questões a partir do seu material.
          </p>
        </div>
        <Button asChild variant="primary" size="md">
          <Link href={`/app/turmas/${classId}/provas/nova`}>
            <Plus className="size-4" strokeWidth={2.5} />
            Criar primeira prova
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <ul>
        {exams.map((exam, i) => (
          <ExamRow
            key={exam.id}
            exam={exam}
            classId={classId}
            isLast={i === exams.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}

function ExamRow({
  exam,
  classId,
  isLast,
}: {
  exam: TurmaExamDTO;
  classId: string;
  isLast: boolean;
}) {
  return (
    <ClickableCard
      as="li"
      href={`/app/provas/${exam.id}`}
      ariaLabel={`Abrir ${exam.title}`}
      className={cn(
        "flex items-center gap-5 px-6 py-4 transition-colors hover:bg-gray-50",
        !isLast && "border-b border-gray-100",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">
          {exam.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span>
            {exam.questionCount}{" "}
            {exam.questionCount === 1 ? "questão" : "questões"}
          </span>
          {exam.duration > 0 && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {exam.duration} min
              </span>
            </>
          )}
          {exam.securityLevel === "strict" && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1 text-amber-700">
                <ShieldAlert className="size-3" />
                Modo estrito
              </span>
            </>
          )}
        </div>
      </div>

      <div className="hidden min-w-28 items-center justify-end gap-1.5 text-xs text-gray-500 sm:flex">
        <Users className="size-3.5 text-gray-400" />
        <span className="tabular-nums">
          {exam.submissionsCount}{" "}
          {exam.submissionsCount === 1 ? "submissão" : "submissões"}
        </span>
      </div>

      <div className="hidden min-w-14 text-right text-sm sm:block">
        {exam.averageScore !== null ? (
          <span className="font-medium tabular-nums text-ink">
            {exam.averageScore.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
            })}
            <span className="ml-0.5 text-xs text-gray-400">/10</span>
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>

      <ClickableCardActions>
        <ExamRowMenu exam={exam} classId={classId} />
      </ClickableCardActions>
    </ClickableCard>
  );
}

function ExamRowMenu({
  exam,
  classId,
}: {
  exam: TurmaExamDTO;
  classId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleCopy(e: React.MouseEvent) {
    stop(e);
    try {
      const url = `${window.location.origin}/exam/${exam.shareId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="relative z-10">
      <button
        type="button"
        aria-label="Ações da prova"
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <button
            aria-hidden
            onClick={(e) => {
              stop(e);
              setOpen(false);
            }}
            className="fixed inset-0 z-40"
          />
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-1000 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-pop"
          >
            <Link
              href={`/app/provas/${exam.id}`}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <Eye className="size-4" />
              Abrir
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleCopy}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-600" />
                  Link copiado
                </>
              ) : (
                <>
                  <Link2 className="size-4" />
                  Copiar link público
                </>
              )}
            </button>
            <Link
              href={`/app/provas/${exam.id}/scanner`}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <ScanLine className="size-4" />
              Scanner
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stop(e);
                setOpen(false);
                setExportOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <FileDown className="size-4" />
              Exportar
            </button>
            <div className="my-1 h-px bg-gray-100" />
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stop(e);
                setOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Excluir
            </button>
          </div>
        </>
      )}

      <DeleteExamDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        examTitle={exam.title}
        questionCount={exam.questionCount}
        onConfirm={async () => {
          const result = await deleteExamAction(exam.id, classId);
          if (result.ok) router.refresh();
          return { ok: result.ok, error: result.error?.message };
        }}
      />

      <ExportExamDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        examId={exam.id}
      />
    </div>
  );
}
