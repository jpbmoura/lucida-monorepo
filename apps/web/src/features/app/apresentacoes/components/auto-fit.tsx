"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// Rede de segurança contra overflow: mede o conteúdo vs. o quadro e reduz
// --deck-fit (multiplicador das fontes, todas em `em` sobre 1cqi) até caber.
// Como o layout é 100% cqi (invariante ao tamanho), o fator é estável — não
// precisa reagir a resize, só a mudança de conteúdo e ao carregamento das
// fontes. Garante que NADA é cortado, em qualquer tema/idioma.
const MIN_FIT = 0.45;
const ITERATIONS = 8;

export function AutoFit({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const canvas = el.closest<HTMLElement>(".deck-canvas");
    if (!canvas) return;

    let cancelled = false;

    const fit = () => {
      if (cancelled) return;
      const cs = getComputedStyle(canvas);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const availH = canvas.clientHeight - padY;
      const availW = canvas.clientWidth - padX;
      if (availH <= 0 || availW <= 0) return;

      const fits = () =>
        el.scrollHeight <= availH + 0.5 && el.scrollWidth <= availW + 0.5;

      // Cabe no tamanho de design? Mantém 1 (nunca aumenta).
      el.style.setProperty("--deck-fit", "1");
      if (fits()) return;

      // Busca binária pelo maior fator que cabe.
      let lo = MIN_FIT;
      let hi = 1;
      let best = MIN_FIT;
      for (let i = 0; i < ITERATIONS; i++) {
        const mid = (lo + hi) / 2;
        el.style.setProperty("--deck-fit", String(mid));
        if (fits()) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      el.style.setProperty("--deck-fit", String(best));
    };

    fit();
    // Re-mede quando as fontes do tema terminam de carregar (métricas mudam).
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(fit);
    }

    return () => {
      cancelled = true;
    };
  }, [children]);

  return (
    <div ref={ref} className="deck-fit-root relative size-full">
      {children}
    </div>
  );
}
