"use client";

import { useCallback, useEffect, useState } from "react";
import { useWizardStore } from "./wizard-store";
import { StepMaterial } from "./steps/step-material";
import { StepConfig } from "./steps/step-config";
import { StepGenerating } from "./steps/step-generating";
import { StepReview } from "./steps/step-review";
import type {
  GeneratedQuestion,
  GenerationResult,
  GenerationUsage,
} from "./types";
import { GenerateConfirmDialog } from "@/features/app/billing/components/generate-confirm-dialog";
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
  const addUsage = useWizardStore((s) => s.addUsage);
  const reset = useWizardStore((s) => s.reset);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Dispara estimativa real (server-side) ao abrir o confirm. O backend
  // extrai o material com os mesmos extractors do generate, então o número
  // bate com o débito final dentro da margem de variação dos tokens da IA.
  // Falha silenciosa: o dialog mostra "estimativa indisponível" e segue.
  function openConfirm() {
    setEstimate(null);
    setEstimateLoading(true);
    setConfirmOpen(true);

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

    fetch("/v1/ai/estimate", { method: "POST", body: formData })
      .then(async (r) => {
        if (!r.ok) return null;
        const body = (await r.json()) as {
          data?: { estimatedCredits?: number };
        };
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
      // Backend devolve usage do regenerate junto da questão. Acumula no
      // store pra o badge "X créditos usados" do step-review somar o custo
      // total da geração + cada regeneração.
      const { data } = (await response.json()) as {
        data: { question: GeneratedQuestion; usage: GenerationUsage };
      };
      addUsage(data.usage);
      notifyBalanceChanged();
      return data.question;
    },
    [files, pastedText, youtubeUrls, config, addUsage],
  );

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
        estimateLoading={estimateLoading}
        onConfirm={doGenerate}
      />
    </div>
  );
}
