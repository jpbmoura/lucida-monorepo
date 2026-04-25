"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  /** Estilo flutuante = sem fundo sólido, aparece só no hover do grupo pai. */
  floating?: boolean;
}

/**
 * Botão de copiar pra clipboard. Client porque precisa de
 * `navigator.clipboard` e estado transiente de "copiado". Isolado num
 * arquivo pra que o `CodeBlock` possa ser async server component (e
 * fazer highlighting via Shiki no servidor).
 */
export function CopyButton({ text, floating }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silencioso — seleção manual segue funcionando
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copiado" : "Copiar"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md text-[11px] font-medium text-white/70 transition-all hover:text-white",
        floating
          ? "bg-white/5 px-2 py-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          : "px-2 py-1",
      )}
    >
      {copied ? (
        <>
          <Check className="size-3" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="size-3" />
          Copiar
        </>
      )}
    </button>
  );
}
