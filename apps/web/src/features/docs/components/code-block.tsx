import { cn } from "@/lib/utils";
import { highlightCode } from "../lib/shiki";
import { CopyButton } from "./copy-button";

interface CodeBlockProps {
  /** Código bruto. Renderizado via Shiki quando `language` for conhecido. */
  code: string;
  /**
   * Linguagem pra highlight. Aceita apelidos humanos — "curl", "node", "json",
   * "bash", "typescript". Undefined = plaintext (sem highlight).
   */
  language?: string;
  /** Altura máxima com scroll vertical — útil em exemplos grandes (Node.js). */
  scrollable?: boolean;
  className?: string;
}

/**
 * Bloco de código com syntax highlighting via Shiki (renderiza HTML
 * pré-highlighted no servidor, zero JS no client pra highlight).
 * Apenas o botão de copiar é client.
 *
 * Header sempre presente quando tem `language` — label + copy visível
 * direto. Sem `language`, o botão fica flutuando no canto, aparece no
 * hover pra não poluir blocos curtos.
 */
export async function CodeBlock({
  code,
  language,
  scrollable,
  className,
}: CodeBlockProps) {
  const html = await highlightCode(code, language);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/5 bg-ink",
        className,
      )}
    >
      {language ? (
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-white/30"
            />
            {language}
          </span>
          <CopyButton text={code} />
        </div>
      ) : (
        <div className="absolute right-2 top-2 z-10">
          <CopyButton text={code} floating />
        </div>
      )}
      <div
        // Shiki renderiza `<pre class="shiki ..."><code>...</code></pre>`.
        // Sobrescrevemos:
        //   - background do <pre> pra transparent (o wrapper já é bg-ink)
        //   - padding pra bater com o design
        //   - font via --font-mono (JetBrains Mono)
        //   - rolagem horizontal
        className={cn(
          "font-mono text-[12.5px] leading-relaxed",
          "[&_pre]:!bg-transparent [&_pre]:overflow-x-auto [&_pre]:px-4 [&_pre]:py-3.5",
          // Shiki aplica `color` inline em cada <span>; só precisamos
          // garantir que o texto sem span (edge case) herde claro.
          "[&_pre]:text-white/90",
          scrollable && "max-h-[480px] overflow-y-auto",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
