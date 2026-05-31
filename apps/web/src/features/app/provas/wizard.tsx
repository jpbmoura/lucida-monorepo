"use client";

import { useCallback, useEffect, useState } from "react";
import { buildCombinedPastedText, useWizardStore } from "./wizard-store";
import { postSseExpectingResult, SseHttpError } from "./sse-client";
import { StepMaterial } from "./steps/step-material";
import { StepConfig } from "./steps/step-config";
import { StepGenerating } from "./steps/step-generating";
import { StepReview } from "./steps/step-review";
import type {
  GeneratedQuestion,
  GenerationResult,
  GenerationUsage,
  OpenGenerationResult,
} from "./types";
import { GenerateConfirmDialog } from "@/features/app/billing/components/generate-confirm-dialog";
import { notifyBalanceChanged } from "@/features/app/billing/components/balance-widget";

interface WizardProps {
  classId: string;
  turmaName: string;
  /**
   * Handoff vindo de um plano de aula (módulo "Aulas"). Quando presente, o
   * wizard começa já com o material/título semeados, na etapa de config, e
   * ao salvar a prova grava a back-reference no plano.
   */
  seed?: { title?: string; pastedText?: string };
  fromLessonPlanId?: string;
}

export function Wizard({ classId, turmaName, seed, fromLessonPlanId }: WizardProps) {
  const step = useWizardStore((s) => s.step);
  const setConfig = useWizardStore((s) => s.setConfig);
  const setPastedText = useWizardStore((s) => s.setPastedText);
  const materialFiles = useWizardStore((s) => s.materialFiles);
  const pastedText = useWizardStore((s) => s.pastedText);
  const youtubeUrls = useWizardStore((s) => s.youtubeUrls);
  const config = useWizardStore((s) => s.config);
  const setStep = useWizardStore((s) => s.setStep);
  const setGenerationResult = useWizardStore((s) => s.setGenerationResult);
  const setGenerationProgress = useWizardStore((s) => s.setGenerationProgress);
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

  // Semeia o store a partir do plano de aula (handoff) e pula pra config.
  // Roda uma vez na montagem.
  useEffect(() => {
    if (!seed) return;
    if (seed.title) setConfig({ title: seed.title });
    if (seed.pastedText) setPastedText(seed.pastedText);
    setStep("config");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca o custo exato ao abrir o confirm. Preço tabelado depende só de
  // style + questionCount, então a cotação é instantânea — sem enviar
  // material. Falha silenciosa: o dialog mostra "custo indisponível" e segue.
  function openConfirm() {
    setEstimate(null);
    setEstimateLoading(true);
    setConfirmOpen(true);

    // Prova pode ser mista — soma o custo das objetivas + das discursivas.
    const wantObjective =
      config.questionTypes.multipleChoice || config.questionTypes.trueFalse;
    const wantOpen = config.questionTypes.open;

    const tasks: Promise<number | null>[] = [];
    if (wantObjective) {
      const fd = new FormData();
      fd.append(
        "config",
        JSON.stringify({
          style: config.style,
          questionCount: config.questionCount,
        }),
      );
      tasks.push(
        fetch("/v1/ai/estimate", { method: "POST", body: fd })
          .then(parseEstimate)
          .catch(() => null),
      );
    }
    if (wantOpen) {
      const fd = new FormData();
      fd.append(
        "config",
        JSON.stringify({ questionCount: config.openQuestionCount }),
      );
      tasks.push(
        fetch("/v1/ai/estimate-open", { method: "POST", body: fd })
          .then(parseEstimate)
          .catch(() => null),
      );
    }

    Promise.all(tasks).then((vals) => {
      const known = vals.filter((v): v is number => v !== null);
      setEstimate(known.length > 0 ? known.reduce((a, b) => a + b, 0) : null);
      setEstimateLoading(false);
    });
  }

  async function doGenerate() {
    setStep("generating");
    try {
      const combinedText = buildCombinedPastedText({ materialFiles, pastedText });
      const wantObjective =
        config.questionTypes.multipleChoice || config.questionTypes.trueFalse;
      const wantOpen = config.questionTypes.open;

      let merged: GeneratedQuestion[] = [];
      let usage: GenerationUsage = {
        inputTokens: 0,
        outputTokens: 0,
        credits: 0,
      };

      // Objetivas — gerador clássico. SSE com heartbeat contra ECONNRESET do edge.
      if (wantObjective) {
        const fd = new FormData();
        fd.append(
          "config",
          JSON.stringify({
            questionCount: config.questionCount,
            difficulty: config.difficulty,
            style: config.style,
            questionTypes: {
              multipleChoice: config.questionTypes.multipleChoice,
              trueFalse: config.questionTypes.trueFalse,
            },
            language: config.language,
            pastedText: combinedText,
            youtubeUrls,
          }),
        );
        const data = await postSseExpectingResult<GenerationResult>(
          "/v1/ai/generate-exam",
          { method: "POST", body: fd },
          { onProgress: setGenerationProgress },
        );
        merged = merged.concat(data.questions);
        usage = sumUsage(usage, data.usage);
      }

      // Discursivas — endpoint próprio; mapeadas pra questões type "open".
      if (wantOpen) {
        const fd = new FormData();
        fd.append(
          "config",
          JSON.stringify({
            questionCount: config.openQuestionCount,
            difficulty: config.difficulty,
            style: config.style,
            language: config.language,
            pastedText: combinedText,
            youtubeUrls,
          }),
        );
        const data = await postSseExpectingResult<OpenGenerationResult>(
          "/v1/ai/generate-open-exam",
          { method: "POST", body: fd },
          { onProgress: setGenerationProgress },
        );
        merged = merged.concat(data.questions.map(mapOpenQuestion));
        usage = sumUsage(usage, data.usage);
      }

      setGenerationResult(merged, usage);
      notifyBalanceChanged();
    } catch (err) {
      const message = mapGenerationError(err);
      setGenerationError(message);
    }
  }

  // Regerar uma DISCURSIVA: endpoint próprio, evita os enunciados existentes.
  const handleRegenerateOpen = useCallback(
    async (avoidStatements: string[]): Promise<GeneratedQuestion | null> => {
      const combinedText = buildCombinedPastedText({ materialFiles, pastedText });
      const fd = new FormData();
      fd.append(
        "config",
        JSON.stringify({
          difficulty: config.difficulty,
          style: config.style,
          language: config.language,
          pastedText: combinedText,
          youtubeUrls,
          avoidStatements,
        }),
      );

      const response = await fetch("/v1/ai/regenerate-open-question", {
        method: "POST",
        body: fd,
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
        data: {
          question: OpenGenerationResult["questions"][number];
          usage: GenerationUsage;
        };
      };
      addUsage(data.usage);
      notifyBalanceChanged();
      return mapOpenQuestion(data.question);
    },
    [materialFiles, pastedText, youtubeUrls, config, addUsage],
  );

  // Passada como prop pro StepReview. Manda o mesmo texto combinado da
  // geração inicial + as questões existentes como "evite". Retorna a nova
  // questão pra review atualizar a lista.
  const handleRegenerate = useCallback(
    async (avoidStatements: string[]): Promise<GeneratedQuestion | null> => {
      const combinedText = buildCombinedPastedText({ materialFiles, pastedText });
      const formData = new FormData();
      formData.append(
        "config",
        JSON.stringify({
          difficulty: config.difficulty,
          style: config.style,
          questionTypes: config.questionTypes,
          language: config.language,
          pastedText: combinedText,
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
    [materialFiles, pastedText, youtubeUrls, config, addUsage],
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
        <StepReview
          classId={classId}
          onRegenerate={handleRegenerate}
          onRegenerateOpen={handleRegenerateOpen}
          fromLessonPlanId={fromLessonPlanId}
        />
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

async function parseEstimate(r: Response): Promise<number | null> {
  if (!r.ok) return null;
  const body = (await r.json()) as { data?: { estimatedCredits?: number } };
  return body.data?.estimatedCredits ?? null;
}

function sumUsage(a: GenerationUsage, b: GenerationUsage): GenerationUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    credits: a.credits + b.credits,
  };
}

function mapOpenQuestion(
  q: OpenGenerationResult["questions"][number],
): GeneratedQuestion {
  return {
    type: "open",
    statement: q.statement,
    context: q.context,
    options: [],
    correctAnswer: -1,
    explanation: "",
    difficulty: q.difficulty,
    rubric: q.rubric,
    referenceAnswer: q.referenceAnswer,
  };
}

// Mapeia erro do generate (SSE ou HTTP) pra mensagem mostrada ao usuário.
// 402 INSTITUTION_OUT_OF_CREDITS tem cópia específica; o resto reusa
// `message` quando vem do backend, com fallback genérico.
function mapGenerationError(err: unknown): string {
  if (err instanceof SseHttpError) {
    if (err.status === 402) {
      if (err.code === "INSTITUTION_OUT_OF_CREDITS") {
        return "Sua instituição está sem créditos. Fale com o administrador pra reabastecer.";
      }
      return err.message || "Saldo insuficiente de créditos. Compre mais pra continuar.";
    }
    return err.message || "Falha ao gerar as questões.";
  }
  if (err instanceof Error) return err.message;
  return "Erro inesperado ao gerar a prova.";
}
