import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PeriodFilter } from "@/features/app/analises/components/period-filter";
import { ImpersonateButton } from "@/features/analytics/impersonate/components/impersonate-button";
import { ExportTeacherDialog } from "./export-teacher-dialog";
import type {
  TeacherOverviewDTO,
  TeacherOverviewPeriod,
} from "../data";

interface TeacherHeaderProps {
  teacher: TeacherOverviewDTO["teacher"];
  period: TeacherOverviewPeriod;
  /** ID do user logado — escondemos "Atuar como" quando é o próprio user. */
  currentUserId: string;
  /** Turmas do professor (alimenta o filtro do dialog de export). */
  classes: TeacherOverviewDTO["classes"];
  /** Provas recentes (idem). Capadas pelo overview — caso o usuário precise
   * recortar provas mais antigas, deixa o filtro vazio e usa data. */
  recentExams: TeacherOverviewDTO["recentExams"];
}

export function TeacherHeader({
  teacher,
  period,
  currentUserId,
  classes,
  recentExams,
}: TeacherHeaderProps) {
  const canImpersonate = teacher.id !== currentUserId;
  return (
    <div className="flex flex-col gap-5 border-b border-gray-100 pb-8">
      <Link
        href="/analytics/professores"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Todos os professores
      </Link>

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-analytics-primary to-analytics-dark-01 text-lg font-semibold text-white">
            {initials(teacher.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
              <span className="pulse-dot" />
              Professor
            </div>
            <h1 className="truncate text-3xl font-medium tracking-tighter text-ink md:text-4xl">
              {teacher.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
              <span className="truncate">{teacher.email}</span>
              <span aria-hidden>·</span>
              <RoleBadge role={teacher.role} />
              <span aria-hidden>·</span>
              <span>entrou em {formatJoined(teacher.joinedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportTeacherDialog
            teacherId={teacher.id}
            teacherName={teacher.name}
            classes={classes}
            exams={recentExams}
          />
          {canImpersonate && (
            <ImpersonateButton
              teacherId={teacher.id}
              teacherName={teacher.name}
            />
          )}
          <PeriodFilter
            active={period}
            baseHref={`/analytics/professores/${teacher.id}`}
          />
        </div>
      </div>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: "owner" | "admin" | "member";
}) {
  if (role === "owner") {
    return (
      <span className="rounded-full bg-analytics-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-analytics-primary">
        Owner
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
        Admin
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
      Professor
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

function formatJoined(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
