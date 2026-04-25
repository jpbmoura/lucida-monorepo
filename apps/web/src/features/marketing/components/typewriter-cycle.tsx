"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypewriterCycleProps {
  words: readonly string[];
  className?: string;
  /** ms entre as letras enquanto digita */
  typeMs?: number;
  /** ms entre as letras enquanto apaga */
  deleteMs?: number;
  /** ms parado depois de digitar a palavra inteira */
  holdMs?: number;
}

/**
 * Efeito typewriter — digita uma palavra, pausa, apaga e troca pra próxima.
 * Usado no H1 do Hero pra rotacionar entre os tipos de conteúdo que a Lucida
 * gera (provas, slides, aulas...). Flui naturalmente — o texto seguinte
 * acompanha o cursor sem gap reservado, ainda que isso cause pequenos
 * reflows quando palavras de tamanhos diferentes alternam.
 */
export function TypewriterCycle({
  words,
  className,
  typeMs = 85,
  deleteMs = 45,
  holdMs = 1700,
}: TypewriterCycleProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");

  useEffect(() => {
    if (words.length === 0) return;
    const current = words[wordIndex];
    if (!current) return;

    if (phase === "typing") {
      if (text.length < current.length) {
        const t = setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          typeMs,
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("deleting"), holdMs);
      return () => clearTimeout(t);
    }

    if (text.length > 0) {
      const t = setTimeout(
        () => setText(current.slice(0, text.length - 1)),
        deleteMs,
      );
      return () => clearTimeout(t);
    }

    setWordIndex((i) => (i + 1) % words.length);
    setPhase("typing");
  }, [text, phase, wordIndex, words, typeMs, deleteMs, holdMs]);

  return (
    <span
      className={cn("inline-block whitespace-nowrap align-baseline", className)}
    >
      {text}
      <span
        aria-hidden
        className="ml-px inline-block h-[0.85em] w-[0.06em] translate-y-[0.05em] animate-pulse rounded-sm bg-current"
      />
    </span>
  );
}
