"use client";

import { useEffect, useState } from "react";
import { buildCombinedPastedText, useAulaWizardStore } from "./wizard-store";
import { postSseExpectingResult, SseHttpError } from "@/features/app/provas/sse-client";
import { StepSegment } from "./steps/step-segment";
import { StepContext } from "./steps/step-context";
import { StepGenerating } from "./steps/step-generating";
import { StepCanvas } from "./steps/step-canvas";
import { BetaNotice } from "./components/beta-notice";
import { GenerateConfirmDialog } from "@/features/app/billing/components/generate-confirm-dialog";
import { notifyBalanceChanged } from "@/features/app/billing/components/balance-widget";
import type { GenerateLessonPlanResult } from "./types";

interface AulaWizardProps {
  classId: string;
  turmaName: string;
}

export function AulaWizard({ classId, turmaName }: AulaWizardProps) {
  const step = useAulaWizardStore((s) => s.step);
  const config = useAulaWizardStore((s) => s.config);
  const materialFiles = useAulaWizardStore((s) => s.materialFiles);
  const pastedText = useAulaWizardStore((s) => s.pastedText);
  const youtubeUrls = useAulaWizardStore((s) => s.youtubeUrls);
  const setStep = useAulaWizardStore((s) => s.setStep);
  const setConfig = useAulaWizardStore((s) => s.setConfig);
  const setGenerationResult = useAulaWizardStore((s) => s.setGenerationResult);
  const setGenerationError = useAulaWizardStore((s) => s.setGenerationError);
  const reset = useAulaWizardStore((s) => s.reset);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  // Cota o custo (preço tabelado por segmento) ao abrir o confirm.
  function openConfirm() {
    setEstimate(null);
    setEstimateLoading(true);
    setConfirmOpen(true);

    const formData = new FormData();
    formData.append("config", JSON.stringify({ segment: config.segment }));

    fetch("/v1/ai/estimate-lesson-plan", { method: "POST", body: formData })
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
    setStep("generating");
    try {
      const combinedText = buildCombinedPastedText({ materialFiles, pastedText });
      const formData = new FormData();
      formData.append(
        "config",
        JSON.stringify({
          segment: config.segment,
          title: config.title,
          subject: config.subject,
          level: config.level,
          durationMinutes: config.durationMinutes,
          language: config.language,
          pastedText: combinedText,
          youtubeUrls,
        }),
      );

      const data = await postSseExpectingResult<GenerateLessonPlanResult>(
        "/v1/ai/generate-lesson-plan",
        { method: "POST", body: formData },
      );
      // Preenche disciplina/nível com o que a IA inferiu quando o professor
      // deixou em branco — pra o plano salvo carregar a identificação completa.
      const patch: { subject?: string; level?: string } = {};
      if (!config.subject.trim() && data.subject) patch.subject = data.subject;
      if (!config.level.trim() && data.level) patch.level = data.level;
      if (Object.keys(patch).length > 0) setConfig(patch);

      setGenerationResult(data.plan, data.usage);
      notifyBalanceChanged();
    } catch (err) {
      setGenerationError(mapError(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-10">
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
        Novo plano · <span className="text-gray-600">{turmaName}</span>
      </p>

      {step !== "generating" && <BetaNotice className="mb-8" />}

      {step === "segment" && <StepSegment />}
      {step === "context" && <StepContext onGenerate={openConfirm} />}
      {step === "generating" && <StepGenerating />}
      {step === "canvas" && <StepCanvas classId={classId} />}

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
    return err.message || "Falha ao gerar o plano.";
  }
  if (err instanceof Error) return err.message;
  return "Erro inesperado ao gerar o plano.";
}
