"use client";

import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";

interface SecretRevealPanelProps {
  label: string;
  secret: string;
  /**
   * Texto de ajuda contextual. Usado pra diferenciar "sua chave" vs
   * "signing secret do webhook" em copy.
   */
  hint?: string;
}

/**
 * Painel "reveal-once" — exibe o plaintext com botão de copiar e um
 * aviso visual de que não será mostrado de novo. Usado tanto no fluxo
 * de criação de API key quanto de webhook endpoint (criação + rotate).
 *
 * Não tem estado de "fechado" — o wrapper (dialog) controla. Aqui só
 * renderiza o valor + UX de cópia.
 */
export function SecretRevealPanel({
  label,
  secret,
  hint,
}: SecretRevealPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      // Reset discreto pra permitir um segundo clique caso o usuário
      // queira garantir (comum com passwords/secrets).
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Tolera falha silenciosamente — o user ainda pode selecionar o
      // texto manualmente. Sem toast por enquanto; se virar comum,
      // melhoramos.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="text-[13px] leading-relaxed text-amber-900">
          Guarde este valor agora — <strong>ele não será exibido de novo</strong>.
          {hint ? <> {hint}</> : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            {label}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="size-3.5" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copiar
              </>
            )}
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          {/*
            `break-all` em vez de `whitespace-nowrap` — secret é sequência
            sem quebras naturais. Quebrar em qualquer caractere é o padrão
            de Stripe/GitHub pra keys. Elimina overflow horizontal e
            mantém o valor copiável 1:1.
          */}
          <code className="block break-all font-mono text-[12px] leading-relaxed text-ink">
            {secret}
          </code>
        </div>
      </div>
    </div>
  );
}
