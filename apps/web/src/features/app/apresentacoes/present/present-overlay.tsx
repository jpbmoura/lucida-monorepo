"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Slide, SlideTheme } from "../types";
import { DeckFrame } from "../components/deck-frame";
import { SlideCanvas } from "../components/slide-canvas";

// Modo apresentar — overlay fullscreen dentro da plataforma. Navegação por
// teclado (← →, Esc), clique nas laterais, contador. Sem interação de aluno.
export function PresentOverlay({
  slides,
  theme,
  startIndex = 0,
  onClose,
}: {
  slides: Slide[];
  theme: SlideTheme;
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const total = slides.length;

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(Math.max(i + delta, 0), total - 1)),
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
        aria-label="Sair da apresentação"
      >
        <X className="size-5" />
      </button>

      <div className="flex flex-1 items-center justify-center p-[3vh]">
        <DeckFrame
          theme={theme}
          className="w-full max-w-[calc(177.78vh-6vh)] shadow-2xl"
        >
          <SlideCanvas slide={slide} />
        </DeckFrame>
      </div>

      {/* zonas de clique pra navegar */}
      <button
        className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize"
        onClick={() => go(-1)}
        aria-label="Slide anterior"
      />
      <button
        className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize"
        onClick={() => go(1)}
        aria-label="Próximo slide"
      />

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80">
        {index + 1} / {total}
      </div>
    </div>
  );
}
