"use client";

import {
  ArrowRight,
  GraduationCap,
  School,
  BookOpen,
  Check,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAulaWizardStore } from "../wizard-store";
import { SEGMENT_META, type LessonPlanSegment } from "../types";

const ICONS: Record<LessonPlanSegment, LucideIcon> = {
  FUNDAMENTAL: School,
  MEDIO: GraduationCap,
  FACULDADE: BookOpen,
  INFOPRODUTOR: Video,
};

const ORDER: LessonPlanSegment[] = [
  "FUNDAMENTAL",
  "MEDIO",
  "FACULDADE",
  "INFOPRODUTOR",
];

export function StepSegment() {
  const segment = useAulaWizardStore((s) => s.config.segment);
  const selected = useAulaWizardStore((s) => s.segmentChosen);
  const setSegment = useAulaWizardStore((s) => s.setSegment);
  const setStep = useAulaWizardStore((s) => s.setStep);

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          Etapa 1 de 3 · Segmento
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Pra quem é{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            essa aula?
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-gray-500">
          Cada segmento tem campos e vocabulário próprios — a Lulu adapta o
          plano ao contexto certo.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ORDER.map((value) => {
          const meta = SEGMENT_META[value];
          const Icon = ICONS[value];
          const active = selected && value === segment;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setSegment(value)}
              className={cn(
                "flex items-start gap-4 rounded-2xl border bg-white p-5 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary/5",
                active
                  ? "border-brand-primary ring-1 ring-brand-primary"
                  : "border-gray-200",
              )}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {meta.label}
                  </span>
                  {active && (
                    <Check className="size-4 shrink-0 text-brand-primary" />
                  )}
                </div>
                <div className="mt-0.5 text-[13px] text-gray-500">
                  {meta.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-end">
          <Button
            variant="primary"
            size="lg"
            disabled={!selected}
            onClick={() => setStep("context")}
            className="w-full sm:w-auto"
          >
            Continuar
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
