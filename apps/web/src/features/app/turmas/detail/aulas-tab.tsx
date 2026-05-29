"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Copy,
  Eye,
  FileDown,
  MoreHorizontal,
  Plus,
  NotebookPen,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClickableCard, ClickableCardActions } from "@/components/ui/clickable-card";
import { cn } from "@/lib/utils";
import {
  archiveLessonPlanAction,
  deleteLessonPlanAction,
  duplicateLessonPlanAction,
} from "@/features/app/aulas/actions";
import { SEGMENT_META, type LessonPlanListItem } from "@/features/app/aulas/types";

interface AulasTabProps {
  classId: string;
  plans: LessonPlanListItem[];
}

export function AulasTab({ classId, plans }: AulasTabProps) {
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <NotebookPen className="size-5" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-medium text-ink">Nenhum plano por aqui</h3>
          <p className="max-w-sm text-sm text-gray-500">
            Crie o primeiro plano de aula. A Lulu monta a estrutura a partir do
            seu material — e depois ele vira prova num clique.
          </p>
        </div>
        <Button asChild variant="primary" size="md">
          <Link href={`/app/turmas/${classId}/aulas/nova`}>
            <Plus className="size-4" strokeWidth={2.5} />
            Criar primeiro plano
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <ul>
        {plans.map((plan, i) => (
          <PlanRow
            key={plan.id}
            plan={plan}
            classId={classId}
            isLast={i === plans.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}

function PlanRow({
  plan,
  classId,
  isLast,
}: {
  plan: LessonPlanListItem;
  classId: string;
  isLast: boolean;
}) {
  return (
    <ClickableCard
      as="li"
      href={`/app/aulas/${plan.id}`}
      ariaLabel={`Abrir ${plan.title}`}
      className={cn(
        "flex items-center gap-5 px-6 py-4 transition-colors hover:bg-gray-50",
        !isLast && "border-b border-gray-100",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {plan.title}
          </span>
          {plan.status === "ARCHIVED" && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              Arquivado
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span className="rounded-md bg-brand-primary/10 px-1.5 py-0.5 font-medium text-brand-primary">
            {SEGMENT_META[plan.segment].label}
          </span>
          {plan.subject && <span>{plan.subject}</span>}
          {plan.level && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span>{plan.level}</span>
            </>
          )}
          {plan.durationMinutes > 0 && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {plan.durationMinutes} min
              </span>
            </>
          )}
          {plan.generatedExamId && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Sparkles className="size-3" />
                Prova gerada
              </span>
            </>
          )}
        </div>
      </div>

      <ClickableCardActions>
        <PlanRowMenu plan={plan} classId={classId} />
      </ClickableCardActions>
    </ClickableCard>
  );
}

function PlanRowMenu({
  plan,
  classId,
}: {
  plan: LessonPlanListItem;
  classId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function run(fn: () => Promise<{ ok: boolean }>) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await fn();
      if (result.ok) router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative z-10">
      <button
        type="button"
        aria-label="Ações do plano"
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
              href={`/app/aulas/${plan.id}`}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <Eye className="size-4" />
              Abrir
            </Link>
            <Link
              href={`/app/turmas/${classId}/provas/nova?fromLessonPlan=${plan.id}`}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <Sparkles className="size-4" />
              Gerar prova
            </Link>
            <a
              href={`/v1/lesson-plans/${plan.id}/export.docx`}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <FileDown className="size-4" />
              Exportar Word
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stop(e);
                void run(() => duplicateLessonPlanAction(plan.id, classId));
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              <Copy className="size-4" />
              Duplicar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stop(e);
                void run(() =>
                  archiveLessonPlanAction(
                    plan.id,
                    classId,
                    plan.status !== "ARCHIVED",
                  ),
                );
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
            >
              {plan.status === "ARCHIVED" ? (
                <>
                  <ArchiveRestore className="size-4" />
                  Restaurar
                </>
              ) : (
                <>
                  <Archive className="size-4" />
                  Arquivar
                </>
              )}
            </button>
            <div className="my-1 h-px bg-gray-100" />
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stop(e);
                void run(() => deleteLessonPlanAction(plan.id, classId));
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
