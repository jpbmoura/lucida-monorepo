import Link from "next/link";
import { ArrowRight, AlertCircle, Sparkles, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewDTO } from "@/features/app/analises/data";

interface LuluSuggestionProps {
  atRiskStudents: OverviewDTO["atRiskStudents"];
  /** Submissões com discursivas aguardando correção do professor. */
  pendingCorrections: number;
}

export function LuluSuggestion({
  atRiskStudents,
  pendingCorrections,
}: LuluSuggestionProps) {
  const hasAtRisk = atRiskStudents.length > 0;
  const hasPending = pendingCorrections > 0;
  const preview = atRiskStudents.slice(0, 3);

  return (
    <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-2xl bg-brand-super-dark p-8 text-brand-off-white">
      <LuluDecoration />

      <div className="relative z-10 flex-1">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-brand-light">
          <Sparkles className="size-3" />
          Lulu sugere
          <span className="h-px flex-1 bg-brand-light/20" />
        </div>

        {hasPending ? (
          <>
            <p className="font-serif text-[24px] leading-[1.25] tracking-tight">
              Você tem{" "}
              <span className="italic text-brand-light">
                {pendingCorrections}{" "}
                {pendingCorrections === 1
                  ? "correção pendente"
                  : "correções pendentes"}
              </span>
              . Os alunos das discursivas estão esperando o feedback.
            </p>
            {hasAtRisk && (
              <ul className="mt-5 flex flex-col gap-1">
                {preview.map((s, i) => (
                  <li key={s.studentId}>
                    <Link
                      href={`/app/analises/alunos/${s.studentId}`}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg py-2 transition-colors hover:bg-white/5",
                        i < preview.length - 1 && "border-b border-white/5",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">
                          {s.studentName}
                        </div>
                        <div className="truncate text-[11px] text-white/50">
                          {s.className}
                          <span className="mx-1.5 text-white/20">·</span>
                          <span className="italic">{s.lastExamTitle}</span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-0.5 text-[13px] font-semibold tabular-nums text-red-200">
                        {s.lastScore.toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : hasAtRisk ? (
          <>
            <p className="font-serif text-[24px] leading-[1.25] tracking-tight">
              Você tem{" "}
              <span className="italic text-brand-light">
                {atRiskStudents.length}{" "}
                {atRiskStudents.length === 1 ? "aluno" : "alunos"} em risco
              </span>
              . Vale um olhar rápido nas últimas notas antes que virem bola de neve.
            </p>
            <ul className="mt-5 flex flex-col gap-1">
              {preview.map((s, i) => (
                <li key={s.studentId}>
                  <Link
                    href={`/app/analises/alunos/${s.studentId}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg py-2 transition-colors hover:bg-white/5",
                      i < preview.length - 1 && "border-b border-white/5",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {s.studentName}
                      </div>
                      <div className="truncate text-[11px] text-white/50">
                        {s.className}
                        <span className="mx-1.5 text-white/20">·</span>
                        <span className="italic">{s.lastExamTitle}</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-0.5 text-[13px] font-semibold tabular-nums text-red-200">
                      {s.lastScore.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="font-serif text-[24px] leading-[1.25] tracking-tight">
            Ninguém em risco no período —{" "}
            <span className="italic text-brand-light">sua turma tá no ritmo</span>.
            Que tal preparar a próxima prova?
          </p>
        )}
      </div>

      <Link
        href={
          hasPending ? "/app/turmas" : hasAtRisk ? "/app/analises" : "/app/cursos"
        }
        className="relative z-10 mt-6 inline-flex w-fit items-center gap-2 rounded-pill bg-brand-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-ink"
      >
        {hasPending ? (
          <>
            Corrigir provas
            <PencilLine className="size-3.5" strokeWidth={2.5} />
          </>
        ) : hasAtRisk ? (
          <>
            Ver todos os alunos
            <AlertCircle className="size-3.5" strokeWidth={2.5} />
          </>
        ) : (
          <>
            Criar próxima prova
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </>
        )}
      </Link>
    </div>
  );
}

function LuluDecoration() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-10 -top-10 size-[200px] opacity-[0.08]"
    >
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="100" rx="80" ry="70" fill="#7FBDF4" />
        <ellipse cx="40" cy="100" rx="20" ry="50" fill="#7FBDF4" />
        <ellipse cx="160" cy="100" rx="15" ry="40" fill="#7FBDF4" />
        <circle cx="75" cy="95" r="12" fill="#051E2C" />
        <circle cx="125" cy="95" r="12" fill="#051E2C" />
      </svg>
    </div>
  );
}
