"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Slide } from "../types";
import { SlideCanvas } from "./slide-canvas";

// Miniatura fiel: renderiza o slide num tamanho de design fixo (1280px) e o
// escala pra largura do container via transform. Idêntico ao slide real, só
// menor — e o AutoFit do SlideCanvas mede num tamanho real (1280px), sem os
// artefatos de container minúsculo. Deve estar dentro de um <DeckFrame>.
const DESIGN_W = 1280;

export function SlideThumb({ slide }: { slide: Slide }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / DESIGN_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative aspect-video w-full overflow-hidden">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: DESIGN_W, transform: `scale(${scale})` }}
      >
        <SlideCanvas slide={slide} />
      </div>
    </div>
  );
}
