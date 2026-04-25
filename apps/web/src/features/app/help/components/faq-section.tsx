"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS, type FaqItem } from "../faq-data";

interface FaqSectionProps {
  /** FAQ a exibir. Default: perguntas do /app. /analytics/ajuda passa o
   *  conjunto institucional. */
  items?: FaqItem[];
  title?: string;
}

export function FaqSection({
  items = FAQ_ITEMS,
  title = "Respostas rápidas pras dúvidas mais comuns",
}: FaqSectionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="mt-12">
      <header className="mb-5 flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Perguntas frequentes
        </div>
        <h2 className="text-2xl font-medium tracking-tight text-ink">{title}</h2>
      </header>

      <ul className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {items.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <li
              key={item.question}
              className={cn(i < items.length - 1 && "border-b border-gray-100")}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-ink">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-gray-400 transition-transform",
                    isOpen && "rotate-180 text-ink",
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-0 text-[14px] leading-relaxed text-gray-600">
                  {item.answer}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
