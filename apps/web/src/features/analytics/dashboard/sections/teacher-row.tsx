"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { OrgOverviewDTO } from "../data";

interface TeacherRowProps {
  teacher: OrgOverviewDTO["teachers"][number];
}

/**
 * Row clicável do `TeachersList`. É client-only porque usa `useRouter` pra
 * navegar pro drill-down do professor. Prefere `router.push` em `onClick`
 * em vez de `<Link>` wrappeando as cells porque o elemento HTML é `<tr>` —
 * aninhar `<a>` dentro de tabela quebra semântica e estilo.
 */
export function TeacherRow({ teacher }: TeacherRowProps) {
  const router = useRouter();
  const href = `/analytics/professores/${teacher.id}`;

  return (
    <tr
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      role="link"
      tabIndex={0}
      className="cursor-pointer transition-colors hover:bg-gray-50/60 focus-visible:bg-gray-50 focus-visible:outline-none"
    >
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-analytics-primary to-analytics-dark-01 text-[11px] font-semibold text-white">
            {initials(teacher.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-medium text-ink">
                {teacher.name}
              </span>
              {teacher.role === "owner" && (
                <span className="rounded-full bg-analytics-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-analytics-primary">
                  Owner
                </span>
              )}
              {teacher.role === "admin" && (
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Admin
                </span>
              )}
              {teacher.atRisk && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700">
                  Em atenção
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-gray-500">
              {teacher.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-right tabular-nums text-[13px] text-gray-700">
        {teacher.examsCreated.toLocaleString("pt-BR")}
      </td>
      <td className="px-2 py-3 text-right tabular-nums text-[13px] text-gray-700">
        {teacher.submissionsReceived.toLocaleString("pt-BR")}
      </td>
      <td
        className={cn(
          "px-2 py-3 text-right tabular-nums text-[13px]",
          teacher.atRisk ? "font-medium text-amber-700" : "text-gray-700",
        )}
      >
        {teacher.averageScore !== null
          ? teacher.averageScore.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : "—"}
        {teacher.averageScore !== null && (
          <span className="text-[10px] text-gray-400">/10</span>
        )}
      </td>
      <td className="py-3 pl-2 pr-4 text-right text-[11px] text-gray-500">
        {formatRelative(teacher.lastActivityAt)}
      </td>
    </tr>
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

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso);
  const diffDays = Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 semana atrás" : `${weeks} semanas atrás`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 mês atrás" : `${months} meses atrás`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 ano atrás" : `${years} anos atrás`;
}
