"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useDeckWizardStore } from "../wizard-store";
import { DeckFrame } from "../components/deck-frame";
import { SlideThumb } from "../components/slide-thumb";

export function StepGenerating() {
  const liveSlides = useDeckWizardStore((s) => s.liveSlides);
  const progress = useDeckWizardStore((s) => s.progress);
  const theme = useDeckWizardStore((s) => s.theme);
  const requested = progress?.requested ?? useDeckWizardStore.getState().config.slideCount;
  const delivered = liveSlides.length;

  // Geração não pode ser interrompida no meio (perderia o trabalho e os
  // créditos) — avisa antes de fechar/recarregar a aba. Mesmo padrão das provas.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Overlay de tela cheia (fixed inset-0, z alto) cobre todo o app — inclusive a
  // sidebar — então durante a geração não dá pra clicar em nada nem sair por engano.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gerando apresentação"
      className="fixed inset-0 z-100 flex flex-col items-center gap-8 overflow-y-auto bg-white px-6 py-14"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-primary/20" />
          <div className="relative grid size-20 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Sparkles className="size-9" strokeWidth={1.8} />
          </div>
        </div>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-2xl font-medium tracking-tight text-ink">
            Montando sua{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              apresentação
            </span>
          </h2>
          <p className="text-sm text-gray-500">
            {delivered} de {requested} slides prontos · não feche esta aba
          </p>
        </div>
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{ width: `${requested ? (delivered / requested) * 100 : 0}%` }}
          />
        </div>
      </div>

      <DeckFrame
        theme={theme}
        className="grid w-full max-w-5xl grid-cols-2 gap-3 pb-10 md:grid-cols-3"
      >
        {liveSlides.map((slide) => (
          <div
            key={slide.id}
            className="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
          >
            <SlideThumb slide={slide} />
          </div>
        ))}
        {delivered < requested && (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
            <Sparkles className="size-5 animate-pulse text-gray-300" />
          </div>
        )}
      </DeckFrame>
    </div>
  );
}
