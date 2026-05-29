"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAulaWizardStore, buildCombinedPastedText } from "../wizard-store";
import { PlanBlocks } from "../components/plan-blocks";
import { regenerateBlock } from "../regenerate-block";
import { createLessonPlanAction } from "../actions";
import { notifyBalanceChanged } from "@/features/app/billing/components/balance-widget";
import type { LessonPlanBlockKey } from "../types";

interface StepCanvasProps {
  classId: string;
}

export function StepCanvas({ classId }: StepCanvasProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const config = useAulaWizardStore((s) => s.config);
  const plan = useAulaWizardStore((s) => s.plan);
  const usage = useAulaWizardStore((s) => s.usage);
  const materialFiles = useAulaWizardStore((s) => s.materialFiles);
  const pastedText = useAulaWizardStore((s) => s.pastedText);
  const youtubeUrls = useAulaWizardStore((s) => s.youtubeUrls);
  const setBlock = useAulaWizardStore((s) => s.setBlock);
  const addUsage = useAulaWizardStore((s) => s.addUsage);
  const setStep = useAulaWizardStore((s) => s.setStep);
  const reset = useAulaWizardStore((s) => s.reset);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!plan) return null;

  async function handleRegenerate(key: LessonPlanBlockKey) {
    if (!plan) return;
    setError(null);
    try {
      const combinedText = buildCombinedPastedText({ materialFiles, pastedText });
      const result = await regenerateBlock({
        config,
        currentPlan: plan,
        blockKey: key,
        pastedText: combinedText,
        youtubeUrls,
      });
      const value = result.block[key];
      if (value !== undefined) setBlock(key, value as string | string[]);
      addUsage(result.usage);
      notifyBalanceChanged();
    } catch (err) {
      setError((err as Error).message ?? "Erro ao regerar o bloco.");
    }
  }

  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createLessonPlanAction({
        classId,
        segment: config.segment,
        status: "READY",
        identification: {
          title: config.title,
          subject: config.subject,
          level: config.level,
          durationMinutes: config.durationMinutes,
          date: null,
        },
        content: plan,
        usage,
      });
      if (!result.ok || !result.data) {
        setError(result.error?.message ?? "Não foi possível salvar o plano.");
        return;
      }
      const planId = result.data.id;
      reset();
      startTransition(() => {
        router.push(`/app/aulas/${planId}`);
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-32">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Etapa 3 de 3 · Canvas
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Seu plano está{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            pronto
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-gray-500">
          Edite cada bloco direto no card ou regenere só o que não ficou bom.
        </p>

        {usage && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-primary/10 px-3 py-1.5 text-xs font-medium text-brand-primary">
            <Sparkles className="size-3.5" />
            {usage.credits}{" "}
            {usage.credits === 1 ? "crédito usado" : "créditos usados"}
          </div>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <PlanBlocks
        segment={config.segment}
        content={plan}
        onChange={setBlock}
        onRegenerate={handleRegenerate}
      />

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setStep("context")}
            disabled={saving}
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
            <Save className="size-4" strokeWidth={2.5} />
            {saving ? "Salvando plano…" : "Salvar plano"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
