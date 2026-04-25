"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  /** Id do elemento-âncora na página (ex.: id de uma `<section>`). */
  id: string;
  /** Texto exibido no TOC. */
  title: string;
  /** 2 = h2 (padrão); 3 = h3 (entra indentado). */
  level?: 2 | 3;
}

interface DocsTocProps {
  items: TocItem[];
  className?: string;
}

/**
 * "Nesta página" sticky à direita — scroll spy via IntersectionObserver.
 *
 * O `rootMargin` negativo "aperta" a zona de detecção pra ~30% central
 * do viewport, evitando que seções curtas no topo/base fiquem piscando
 * o ativo. Só mostra em `xl+` — em viewports menores, o espaço é usado
 * pelo conteúdo principal.
 */
export function DocsToc({ items, className }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string | null>(
    items[0]?.id ?? null,
  );

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Escolhe a seção visível que está mais próxima do topo — evita
        // flicker quando duas seções ficam visíveis ao mesmo tempo.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        // Zona de detecção: começa 96px abaixo do topo, termina 55% acima
        // do fundo. Seções que cruzam esse canal ganham o "ativo".
        rootMargin: "-96px 0px -55% 0px",
        threshold: 0,
      },
    );

    const observed: Element[] = [];
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside
      className={cn(
        "sticky top-6 hidden h-fit max-h-[calc(100vh-3rem)] overflow-y-auto xl:block",
        "scrollbar-thin",
        className,
      )}
    >
      <div className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
        Nesta página
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "block border-l-2 px-3 py-1 text-[12.5px] transition-colors",
                  item.level === 3 && "pl-6",
                  isActive
                    ? "border-analytics-primary font-medium text-analytics-primary"
                    : "border-transparent text-gray-500 hover:text-ink",
                )}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
