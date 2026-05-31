"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Users,
  FileText,
  Sparkles,
  PencilLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AiGradingPanel } from "./ai-grading-panel";
import { GradingDrawer } from "./grading-drawer";
import type { GradingQueueDTO, QueueExam, QueueSubmission } from "../data";

interface GradingQueueProps {
  data: GradingQueueDTO;
}

interface DrawerState {
  examId: string;
  examTitle: string;
  submissionIds: string[];
  startIndex: number;
}

export function GradingQueue({ data }: GradingQueueProps) {
  // Conjunto de chaves COLAPSADAS — vazio = tudo aberto (mostra toda a fila).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openDrawer(exam: QueueExam, startIndex: number) {
    setDrawer({
      examId: exam.examId,
      examTitle: exam.examTitle,
      submissionIds: exam.submissions.map((s) => s.submissionId),
      startIndex,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {data.courses.map((course) => {
        const courseKey = `c:${course.courseId ?? "none"}`;
        const courseOpen = !collapsed.has(courseKey);
        return (
          <section
            key={courseKey}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
          >
            <button
              type="button"
              onClick={() => toggle(courseKey)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
            >
              <Chevron open={courseOpen} />
              <FolderOpen className="size-[18px] shrink-0 text-gray-400" />
              <span className="flex-1 truncate font-medium text-ink">
                {course.courseName}
              </span>
              <CountBadge n={course.pendingCount} />
            </button>

            {courseOpen && (
              <div className="border-t border-gray-100 px-3 py-3">
                {course.classes.map((cls) => {
                  const classKey = `k:${cls.classId}`;
                  const classOpen = !collapsed.has(classKey);
                  return (
                    <div key={classKey} className="px-2">
                      <button
                        type="button"
                        onClick={() => toggle(classKey)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                      >
                        <Chevron open={classOpen} small />
                        <Users className="size-4 shrink-0 text-gray-400" />
                        <span className="flex-1 truncate text-sm font-medium text-gray-700">
                          {cls.className}
                        </span>
                        <CountBadge n={cls.pendingCount} subtle />
                      </button>

                      {classOpen && (
                        <div className="ml-3 flex flex-col gap-3 border-l border-gray-100 pb-2 pl-4">
                          {cls.exams.map((exam) => (
                            <ExamBlock
                              key={exam.examId}
                              exam={exam}
                              onCorrigir={(i) => openDrawer(exam, i)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {drawer && (
        <GradingDrawer
          examId={drawer.examId}
          examTitle={drawer.examTitle}
          submissionIds={drawer.submissionIds}
          startIndex={drawer.startIndex}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function ExamBlock({
  exam,
  onCorrigir,
}: {
  exam: QueueExam;
  onCorrigir: (index: number) => void;
}) {
  const draftIds = exam.submissions
    .filter((s) => s.hasAiDraft)
    .map((s) => s.submissionId);

  return (
    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/40 p-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 shrink-0 text-brand-primary" />
        <span className="flex-1 truncate text-sm font-medium text-ink">
          {exam.examTitle}
        </span>
        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
          {exam.pendingCount}{" "}
          {exam.pendingCount === 1 ? "pendente" : "pendentes"}
        </span>
      </div>

      <AiGradingPanel examId={exam.examId} draftSubmissionIds={draftIds} />

      <ul className="mt-4 flex flex-col divide-y divide-gray-100">
        {exam.submissions.map((s, i) => (
          <SubmissionRow
            key={s.submissionId}
            submission={s}
            onCorrigir={() => onCorrigir(i)}
          />
        ))}
      </ul>
    </div>
  );
}

function SubmissionRow({
  submission,
  onCorrigir,
}: {
  submission: QueueSubmission;
  onCorrigir: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">
          {submission.studentName}
        </div>
        <div className="truncate text-[11px] text-gray-400">
          código {submission.studentCode}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge submission={submission} />
        <Button type="button" variant="outline" size="sm" onClick={onCorrigir}>
          <PencilLine className="size-3.5" />
          Corrigir
        </Button>
      </div>
    </li>
  );
}

function StatusBadge({ submission }: { submission: QueueSubmission }) {
  if (submission.hasAiDraft) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
        <Sparkles className="size-3" />
        Rascunho IA
      </span>
    );
  }
  if (submission.gradingStatus === "partially_graded") {
    return (
      <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
        Parcial
      </span>
    );
  }
  return (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Aguardando
    </span>
  );
}

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <Icon
      className={cn("shrink-0 text-gray-400", small ? "size-4" : "size-[18px]")}
    />
  );
}

function CountBadge({ n, subtle }: { n: number; subtle?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        subtle ? "bg-gray-100 text-gray-600" : "bg-brand-primary/10 text-brand-primary",
      )}
    >
      {n}
    </span>
  );
}
