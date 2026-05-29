"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STAGES = [
  "Lendo o material...",
  "Definindo os objetivos de aprendizagem...",
  "Estruturando os momentos da aula...",
  "Sugerindo recursos e avaliação...",
  "Polindo o plano...",
  "Quase lá...",
];

export function StepGenerating() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Geração não pode ser interrompida no meio (perderia o trabalho e os
  // créditos). Enquanto este componente está montado, avisa antes de
  // fechar/recarregar a aba.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Overlay de tela cheia (fixed inset-0, z alto) cobre todo o app — inclusive
  // a sidebar — então durante a geração não dá pra clicar em nada nem sair da
  // tela por engano. Mesmo padrão da geração de provas.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gerando plano de aula"
      className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-8 overflow-y-auto bg-white px-6 py-20 text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-primary/20" />
        <div className="relative grid size-24 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Sparkles className="size-10" strokeWidth={1.8} />
        </div>
      </div>

      <div className="flex max-w-md flex-col gap-3">
        <h2 className="text-3xl font-medium leading-tight tracking-tight text-ink">
          A Lulu está{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            montando seu plano
          </span>
        </h2>
        <p className="text-[15px] text-gray-500">
          Isso costuma levar alguns segundos, dependendo do material.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {STAGES.map((stage, i) => {
          const state =
            i < stageIndex ? "done" : i === stageIndex ? "active" : "pending";
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
    </div>
  );
}
