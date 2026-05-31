"use client";

import { useEffect, useState } from "react";
import { GenerateConfirmDialog } from "@/features/app/billing/components/generate-confirm-dialog";
import { notifyBalanceChanged } from "@/features/app/billing/components/balance-widget";
import {
  buildCombinedPastedText,
  useDeckWizardStore,
} from "./wizard-store";
import { postDeckSse, SseHttpError } from "./sse-client";
import { StepSource } from "./steps/step-source";
import { StepConfig } from "./steps/step-config";
import { StepGenerating } from "./steps/step-generating";
import { DeckEditor } from "./components/deck-editor";
import { BetaNotice } from "./components/beta-notice";
import { createSlideDeckAction } from "./actions";
import type { GenerateDeckResult } from "./types";

interface DeckWizardProps {
  handoff?: {
    lessonPlanId: string;
    title: string;
    subject?: string;
    gradeLevel?: string;
  };
}

export function DeckWizard({ handoff }: DeckWizardProps) {
  const step = useDeckWizardStore((s) => s.step);
  const source = useDeckWizardStore((s) => s.source);
  const config = useDeckWizardStore((s) => s.config);
  const materialFiles = useDeckWizardStore((s) => s.materialFiles);
  const pastedText = useDeckWizardStore((s) => s.pastedText);
  const youtubeUrls = useDeckWizardStore((s) => s.youtubeUrls);
  const lessonPlanId = useDeckWizardStore((s) => s.lessonPlanId);
  const theme = useDeckWizardStore((s) => s.theme);
  const slides = useDeckWizardStore((s) => s.slides);
  const usage = useDeckWizardStore((s) => s.usage);
  const setLessonPlan = useDeckWizardStore((s) => s.setLessonPlan);
  const startGenerating = useDeckWizardStore((s) => s.startGenerating);
  const setProgress = useDeckWizardStore((s) => s.setProgress);
  const pushLiveSlide = useDeckWizardStore((s) => s.pushLiveSlide);
  const setGenerationResult = useDeckWizardStore((s) => s.setGenerationResult);
  const setGenerationError = useDeckWizardStore((s) => s.setGenerationError);
  const reset = useDeckWizardStore((s) => s.reset);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  useEffect(() => {
    if (handoff) {
      setLessonPlan({
        id: handoff.lessonPlanId,
        title: handoff.title,
        subject: handoff.subject,
        gradeLevel: handoff.gradeLevel,
      });
    }
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildConfigPayload() {
    const combinedText =
      source === "material"
        ? buildCombinedPastedText({ materialFiles, pastedText })
        : "";
    return {
      source,
      lessonPlanId: lessonPlanId ?? undefined,
      title: config.title,
      subject: config.subject,
      gradeLevel: config.gradeLevel,
      tone: config.tone,
      slideCount: config.slideCount,
      includeNotes: config.includeNotes,
      includeActivity: config.includeActivity,
      language: config.language,
      pastedText: combinedText,
      youtubeUrls,
    };
  }

  function openConfirm() {
    setEstimate(null);
    setEstimateLoading(true);
    setConfirmOpen(true);
    const formData = new FormData();
    formData.append(
      "config",
      JSON.stringify({ source, slideCount: config.slideCount }),
    );
    fetch("/v1/ai/estimate-deck", { method: "POST", body: formData })
      .then(async (r) => {
        if (!r.ok) return null;
        const body = (await r.json()) as { data?: { estimatedCredits?: number } };
        return body.data?.estimatedCredits ?? null;
      })
      .catch(() => null)
      .then((value) => {
        setEstimate(value);
        setEstimateLoading(false);
      });
  }

  async function doGenerate() {
    startGenerating();
    try {
      const formData = new FormData();
      formData.append("config", JSON.stringify(buildConfigPayload()));
      const data = await postDeckSse<GenerateDeckResult>(
        "/v1/ai/generate-deck",
        { method: "POST", body: formData },
        {
          onProgress: (p) => {
            setProgress({ delivered: p.delivered, requested: p.requested });
            if (p.slide) pushLiveSlide(p.slide);
          },
        },
      );
      setGenerationResult({
        slides: data.slides,
        suggestedTheme: data.suggestedTheme,
        usage: data.usage,
        title: data.title,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
      });
      notifyBalanceChanged();
    } catch (err) {
      setGenerationError(mapError(err));
    }
  }

  if (step === "editor") {
    return (
      <DeckEditor
        mode="create"
        initial={{
          slides,
          theme,
          title: config.title,
          subject: config.subject,
          gradeLevel: config.gradeLevel,
          tone: config.tone,
        }}
        genContext={{
          source,
          lessonPlanId,
          tone: config.tone,
          slideCount: config.slideCount,
          includeNotes: config.includeNotes,
          includeActivity: config.includeActivity,
          language: config.language,
          materialText: buildConfigPayload().pastedText,
          youtubeUrls,
        }}
        onPersist={async (payload) => {
          const result = await createSlideDeckAction({
            title: payload.title,
            subject: payload.subject,
            gradeLevel: payload.gradeLevel,
            tone: payload.tone,
            theme: payload.theme,
            source: { type: source, ref: lessonPlanId },
            slides: payload.slides,
            usage,
          });
          if (result.ok && result.data) return { id: result.data.id };
          return undefined;
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-10">
      <BetaNotice className="mb-8" />
      {step === "source" && <StepSource />}
      {step === "config" && <StepConfig onGenerate={openConfirm} />}
      {step === "generating" && <StepGenerating />}

      <GenerateConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        estimate={estimate}
        estimateLoading={estimateLoading}
        onConfirm={doGenerate}
      />
    </div>
  );
}

function mapError(err: unknown): string {
  if (err instanceof SseHttpError) {
    if (err.status === 402) {
      return err.message || "Saldo insuficiente de créditos. Compre mais pra continuar.";
    }
    return err.message || "Falha ao gerar a apresentação.";
  }
  if (err instanceof Error) return err.message;
  return "Erro inesperado ao gerar a apresentação.";
}
