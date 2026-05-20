import { Fragment } from "react";
import katex from "katex";
import { tokenizeMath } from "@/lib/math-text";

interface RichTextProps {
  /** Texto cru da questão (statement / context / option / explanation). */
  text: string;
  className?: string;
}

/**
 * Renderiza texto de questão com matemática LaTeX (`$…$` inline, `$$…$$`
 * bloco) via KaTeX. Tolerante a `\(\)`, `\[\]` e ambientes nus (ver
 * `tokenizeMath`). Sem `"use client"` de propósito — funciona em Server
 * Components (impressão) e Client Components (review/prova).
 *
 * KaTeX com `throwOnError:false` nunca injeta a entrada crua como HTML;
 * em LaTeX inválido mostra o trecho em vermelho em vez de quebrar a página.
 * Quando não há math, o output é idêntico a renderizar a string direto.
 */
export function RichText({ text, className }: RichTextProps) {
  const segments = tokenizeMath(text ?? "");

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === "text") {
          const lines = seg.value.split("\n");
          return (
            <Fragment key={idx}>
              {lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Fragment>
          );
        }

        const html = katex.renderToString(seg.value, {
          throwOnError: false,
          displayMode: seg.type === "block",
          strict: "ignore",
        });

        return (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
