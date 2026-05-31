import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import type { CalloutVariant, SlideBlock } from "../types";

// Renderiza um bloco tipado usando os tokens do tema (cores/fontes via CSS vars).
// Tamanhos em `em` — relativos à raiz .deck-fit-root (1em = 1cqi * --deck-fit),
// pra auto-escalar E auto-fit. Sem "use client": roda no editor e na impressão.
// Matemática via KaTeX (RichText): $…$ inline; bloco formula vira $$…$$.

const CALLOUT_LABEL: Record<CalloutVariant, string> = {
  term: "Definição",
  note: "Observação",
  example: "Exemplo",
  warning: "Atenção",
};

export function BlockRender({ block }: { block: SlideBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p
          className={cn(
            "leading-snug",
            block.emphasis
              ? "deck-display text-[3.9em] font-semibold"
              : "text-[3.3em] text-[color:var(--deck-ink)]",
          )}
          style={block.emphasis ? { color: "var(--deck-accent)" } : undefined}
        >
          <RichText text={block.text} />
        </p>
      );

    case "bullets":
      return (
        <ul className="flex flex-col gap-[1.6em]">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-[1.8em] text-[3.1em] leading-snug">
              <span
                className="mt-[1.3em] size-[1.4em] shrink-0 rounded-full"
                style={{ backgroundColor: "var(--deck-accent)" }}
                aria-hidden
              />
              <span className="flex-1">
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "formula":
      return (
        <div className="my-[1em] text-center text-[4.2em]">
          <RichText text={`$$${block.latex}$$`} />
        </div>
      );

    case "callout":
      return (
        <div
          className="rounded-[var(--deck-radius)] border-l-[1em] px-[3em] py-[2.4em]"
          style={{
            backgroundColor: "var(--deck-surface)",
            borderColor: "var(--deck-accent)",
          }}
        >
          <p
            className="mb-[1em] text-[2.2em] font-semibold uppercase tracking-wide"
            style={{ color: "var(--deck-accent)" }}
          >
            {CALLOUT_LABEL[block.variant]}
          </p>
          <p className="text-[3.1em] leading-snug">
            <RichText text={block.text} />
          </p>
        </div>
      );

    default:
      return null;
  }
}

export function BlocksRender({ blocks }: { blocks: SlideBlock[] }) {
  return (
    <div className="flex flex-col gap-[2.4em]">
      {blocks.map((block, i) => (
        <BlockRender key={i} block={block} />
      ))}
    </div>
  );
}
