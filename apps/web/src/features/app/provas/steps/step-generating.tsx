"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useWizardStore } from "../wizard-store";

const STAGES = [
  "Lendo o material...",
  "Identificando conceitos-chave...",
  "Rascunhando enunciados...",
  "Montando alternativas...",
  "Polindo a linguagem...",
  "Quase lá...",
];

export function StepGenerating() {
  const [stageIndex, setStageIndex] = useState(0);
  const progress = useWizardStore((s) => s.generationProgress);

  // Top-up loop ativo: 1ª rodada já fechou mas ainda falta questão. Aí
  // trocamos a animação genérica por progresso real (material curto pode
  // levar minutos e várias rodadas).
  const showProgress =
    progress !== null && progress.delivered < progress.requested;

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-20 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-primary/20" />
        <div className="relative grid size-24 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Sparkles className="size-10" strokeWidth={1.8} />
        </div>
      </div>

      <div className="flex flex-col gap-3 max-w-md">
        <h2 className="text-3xl font-medium leading-tight tracking-tight text-ink">
          A Lulu está{" "}
          <span className="font-serif font-normal italic text-brand-primary">preparando sua prova</span>
        </h2>
        <p className="text-[15px] text-gray-500">
          {showProgress
            ? "O material é curto pra essa quantidade — estou completando em algumas rodadas. Pode levar alguns minutos."
            : "Isso costuma levar entre 20 e 60 segundos dependendo do material."}
        </p>
      </div>

      {showProgress && progress ? (
        <div className="flex w-full max-w-sm flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">
              {progress.delivered} de {progress.requested} questões
            </span>
            <span className="text-gray-500">
              rodada {progress.round}/{progress.totalRounds}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-brand-primary transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (progress.delivered / progress.requested) * 100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {STAGES.map((stage, i) => {
          const state = i < stageIndex ? "done" : i === stageIndex ? "active" : "pending";
          return (
            <div
              key={stage}
              className={`flex items-center gap-3 text-sm transition-opacity ${
                state === "pending" ? "opacity-40" : "opacity-100"
              }`}
            >
              <span
                className={`size-2 rounded-full transition-all ${
                  state === "done"
                    ? "bg-brand-primary"
                    : state === "active"
                      ? "animate-pulse bg-brand-primary"
                      : "bg-gray-300"
                }`}
              />
              <span
                className={
                  state === "active"
                    ? "font-medium text-ink"
                    : state === "done"
                      ? "text-gray-500 line-through decoration-gray-300"
                      : "text-gray-500"
                }
              >
                {stage}
              </span>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
