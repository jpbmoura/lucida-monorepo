"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SlideDeckDTO } from "../types";
import { DeckFrame } from "../components/deck-frame";
import { SlideCanvas } from "../components/slide-canvas";

// Versão imprimível do deck → PDF via Ctrl+P (mesmo fluxo do print de planos).
// Um slide por página, paisagem. Reusa os mesmos componentes de slide do editor.
export function PrintDeck({ deck }: { deck: SlideDeckDTO }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
        }
        .deck-print-page { break-after: page; }
        .deck-print-page:last-child { break-after: auto; }
      `}</style>

      <div className="print-toolbar">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-ink">{deck.title}</span>
          <span className="mx-2 text-gray-400">·</span>
          <span className="text-xs">
            Use Ctrl+P (Cmd+P) → &ldquo;Salvar como PDF&rdquo; (ative gráficos de fundo)
          </span>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir
        </Button>
      </div>

      <DeckFrame theme={deck.theme}>
        {deck.slides.map((slide) => (
          <div key={slide.id} className="deck-print-page">
            <SlideCanvas slide={slide} />
          </div>
        ))}
      </DeckFrame>
    </>
  );
}
