"use client";

import Link from "next/link";
import { FileQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HandoffButtonsProps {
  classId: string;
  planId: string;
  /** Compacto pros cards da biblioteca; padrão pra tela final do plano. */
  size?: "sm" | "md";
  className?: string;
}

// Handoff Plano → ecossistema. "Gerar prova" leva ao wizard de provas
// pré-preenchido. "Gerar material" fica desabilitado (módulo Learning ainda
// não existe no MVP).
export function HandoffButtons({
  classId,
  planId,
  size = "md",
  className,
}: HandoffButtonsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button asChild variant="primary" size={size}>
        <Link href={`/app/turmas/${classId}/provas/nova?fromLessonPlan=${planId}`}>
          <Sparkles className="size-4" strokeWidth={2.5} />
          Gerar prova
        </Link>
      </Button>
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
