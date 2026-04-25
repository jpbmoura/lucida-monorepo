"use client";

import { useCallback, useEffect, useState } from "react";
import { useWizardStore } from "./wizard-store";
import { StepMaterial } from "./steps/step-material";
import { StepConfig } from "./steps/step-config";
import { StepGenerating } from "./steps/step-generating";
import { StepReview } from "./steps/step-review";
import type { GeneratedQuestion, GenerationResult } from "./types";
import {
  GenerateConfirmDialog,
  estimateCreditsClient,
} from "@/features/app/billing/components/generate-confirm-dialog";
import { notifyBalanceChanged } from "@/features/app/billing/components/balance-widget";

interface WizardProps {
  classId: string;
  turmaName: string;
}

export function Wizard({ classId, turmaName }: WizardProps) {
  const step = useWizardStore((s) => s.step);
  const files = useWizardStore((s) => s.files);
  const pastedText = useWizardStore((s) => s.pastedText);
  const youtubeUrls = useWizardStore((s) => s.youtubeUrls);
  const config = useWizardStore((s) => s.config);
  const setStep = useWizardStore((s) => s.setStep);
  const setGenerationResult = useWizardStore((s) => s.setGenerationResult);
  const setGenerationError = useWizardStore((s) => s.setGenerationError);
  const reset = useWizardStore((s) => s.reset);

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  function openConfirm() {
    setConfirmOpen(true);
  }

  async function doGenerate() {
    setStep("generating");
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append(
        "config",
        JSON.stringify({
          questionCount: config.questionCount,
          difficulty: config.difficulty,
          style: config.style,
          questionTypes: config.questionTypes,
          pastedText,
          youtubeUrls,
        }),
      );

      const response = await fetch("/v1/ai/generate-exam", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as
          | { code?: string; message?: string }
          | null;
        if (response.status === 402) {
          if (err?.code === "INSTITUTION_OUT_OF_CREDITS") {
            throw new Error(
              "Sua instituição está sem créditos. Fale com o administrador pra reabastecer.",
            );
          }
          throw new Error(
            err?.message ??
              "Saldo insuficiente de créditos. Compre mais pra continuar.",
          );
        }
        throw new Error(err?.message ?? "Falha ao gerar as questões.");
      }

      const { data } = (await response.json()) as { data: GenerationResult };
      setGenerationResult(data.questions, data.usage);
      notifyBalanceChanged();
    } catch (err) {
      setGenerationError((err as Error).message ?? "Erro inesperado ao gerar a prova.");
    }
  }

  // Passada como prop pro StepReview. Faz chamada multipart com os mesmos
  // materiais + questões existentes como "evite". Retorna a nova questão
  // pra review atualizar a lista.
  const handleRegenerate = useCallback(
    async (avoidStatements: string[]): Promise<GeneratedQuestion | null> => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append(
        "config",
        JSON.stringify({
          difficulty: config.difficulty,
          style: config.style,
          questionTypes: config.questionTypes,
          pastedText,
          youtubeUrls,
          avoidStatements,
        }),
      );

      const response = await fetch("/v1/ai/regenerate-question", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as
          | { code?: string; message?: string }
          | null;
        if (response.status === 402) {
          if (err?.code === "INSTITUTION_OUT_OF_CREDITS") {
            throw new Error(
              "Sua instituição está sem créditos. Fale com o administrador pra reabastecer.",
            );
          }
          throw new Error(
            err?.message ?? "Sem créditos pra regerar. Compre mais pra continuar.",
          );
        }
        throw new Error(err?.message ?? "Falha ao regerar a questão.");
      }
      const { data } = (await response.json()) as {
        data: { question: GeneratedQuestion };
      };
      notifyBalanceChanged();
      return data.question;
    },
    [files, pastedText, youtubeUrls, config],
  );

  // Aproximação grosseira — apenas pra o diálogo. O check real é no backend.
  const estimatedMaterialChars =
    pastedText.length + files.reduce((sum, f) => sum + f.size, 0) / 3;
  const estimate = estimateCreditsClient({
    materialChars: estimatedMaterialChars,
    questionCount: config.questionCount,
  });

  // Review usa split view (questões + preview do aluno), precisa mais largura.
  // Os outros steps são forms estreitos.
  const containerClass =
    step === "review"
      ? "mx-auto w-full max-w-[1600px] px-5 py-10 md:px-10"
      : "mx-auto w-full max-w-3xl px-5 py-10 md:px-10";

  return (
    <div className={containerClass}>
      <p className="mb-8 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
        Nova prova · <span className="text-gray-600">{turmaName}</span>
      </p>

      {step === "material" && <StepMaterial classId={classId} />}
      {step === "config" && <StepConfig onGenerate={openConfirm} />}
      {step === "generating" && <StepGenerating />}
      {step === "review" && (
        <StepReview classId={classId} onRegenerate={handleRegenerate} />
      )}

      <GenerateConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        estimate={estimate}
        onConfirm={doGenerate}
      />
    </div>
  );
}
