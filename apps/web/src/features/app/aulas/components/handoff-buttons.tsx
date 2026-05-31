"use client";

import Link from "next/link";
import { FileQuestion, Presentation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HandoffButtonsProps {
  classId: string;
  planId: string;
  /** Compacto pros cards da biblioteca; padrão pra tela final do plano. */
  size?: "sm" | "md";
  className?: string;
  /** Quando presente, mostra "Gerar apresentação" (handoff pro módulo Slides). */
  planTitle?: string;
  planSubject?: string;
  planLevel?: string;
}

// Handoff Plano → ecossistema. "Gerar prova" leva ao wizard de provas
// pré-preenchido. "Gerar material" fica desabilitado (módulo Learning ainda
// não existe no MVP).
export function HandoffButtons({
  classId,
  planId,
  size = "md",
  className,
  planTitle,
  planSubject,
  planLevel,
}: HandoffButtonsProps) {
  const slidesHref = planTitle
    ? `/app/apresentacoes/nova?lessonPlanId=${planId}&title=${encodeURIComponent(planTitle)}` +
      (planSubject ? `&subject=${encodeURIComponent(planSubject)}` : "") +
      (planLevel ? `&gradeLevel=${encodeURIComponent(planLevel)}` : "")
    : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button asChild variant="primary" size={size}>
        <Link href={`/app/turmas/${classId}/provas/nova?fromLessonPlan=${planId}`}>
          <Sparkles className="size-4" strokeWidth={2.5} />
          Gerar prova
        </Link>
      </Button>
      {slidesHref && (
        <Button asChild variant="outline" size={size}>
          <Link href={slidesHref}>
            <Presentation className="size-4" />
            Gerar apresentação
          </Link>
        </Button>
      )}
      <Button
        variant="outline"
        size={size}
        disabled
        title="Em breve — módulo de materiais"
      >
        <FileQuestion className="size-4" />
        Gerar material
        <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          Em breve
        </span>
      </Button>
    </div>
  );
}
