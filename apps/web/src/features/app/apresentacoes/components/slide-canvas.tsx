import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import type { Slide, SlideColumn } from "../types";
import { BlockRender, BlocksRender } from "./block-render";
import { AutoFit } from "./auto-fit";
import "../themes/themes.css";

// Renderiza UM slide num quadro 16:9. O padding do quadro fica em cqi (fixo); o
// conteúdo vive dentro do AutoFit/.deck-fit-root, onde tudo é `em` (1em = 1cqi *
// --deck-fit). Assim o conteúdo auto-escala com o tamanho E nunca estoura
// (AutoFit reduz a fonte até caber). Sem "use client": serve editor e impressão.

function ImageView({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={cn("size-full object-cover", className)} />
  );
}

function Kicker({ text }: { text: string }) {
  return (
    <p
      className="text-[2.4em] font-semibold uppercase tracking-[0.18em]"
      style={{ color: "var(--deck-accent)" }}
    >
      {text}
    </p>
  );
}

function Title({ text, size = "text-[6.5em]" }: { text: string; size?: string }) {
  return (
    <h2 className={cn("deck-display font-semibold leading-[1.05]", size)}>
      <RichText text={text} />
    </h2>
  );
}

function Column({ column }: { column: SlideColumn }) {
  return (
    <div
      className="flex flex-1 flex-col gap-[2.2em] rounded-[var(--deck-radius)] p-[3.2em]"
      style={{ backgroundColor: "var(--deck-surface)", boxShadow: "var(--deck-shadow)" }}
    >
      {column.heading && (
        <h3
          className="deck-display text-[3.6em] font-semibold"
          style={{ color: "var(--deck-accent)" }}
        >
          <RichText text={column.heading} />
        </h3>
      )}
      <BlocksRender blocks={column.blocks} />
    </div>
  );
}

export function SlideCanvas({ slide }: { slide: Slide }) {
  const hasImage = !!slide.image?.url;

  return (
    <div className="deck-canvas relative aspect-video w-full overflow-hidden p-[6cqi]">
      <AutoFit>
        <SlideBody slide={slide} hasImage={hasImage} />
      </AutoFit>
    </div>
  );
}

function SlideBody({ slide, hasImage }: { slide: Slide; hasImage: boolean }) {
  const imageUrl = slide.image?.url ?? "";
  const imageAlt = slide.image?.alt ?? "";

  switch (slide.type) {
    case "cover":
      return (
        <div className="flex size-full">
          <div className="flex flex-1 flex-col justify-center gap-[3em] pr-[4em]">
            <Title text={slide.title} size="text-[8.5em]" />
            {slide.subtitle && (
              <p className="text-[3.8em]" style={{ color: "var(--deck-muted)" }}>
                <RichText text={slide.subtitle} />
              </p>
            )}
            <div
              className="h-[1em] w-[18em] rounded-full"
              style={{ backgroundColor: "var(--deck-accent)" }}
            />
          </div>
          {hasImage && (
            <div className="w-[38%] overflow-hidden rounded-[var(--deck-radius)]">
              <ImageView url={imageUrl} alt={imageAlt} />
            </div>
          )}
        </div>
      );

    case "section":
      return (
        <div className="flex size-full flex-col items-center justify-center gap-[3em] text-center">
          <div
            className="h-[1em] w-[14em] rounded-full"
            style={{ backgroundColor: "var(--deck-accent)" }}
          />
          <Title text={slide.title} size="text-[9em]" />
          {slide.subtitle && (
            <p className="max-w-[70%] text-[3.6em]" style={{ color: "var(--deck-muted)" }}>
              <RichText text={slide.subtitle} />
            </p>
          )}
        </div>
      );

    case "two-column":
    case "comparison":
      return (
        <div className="flex size-full flex-col gap-[3.5em]">
          <div className="flex flex-col gap-[1em]">
            <Kicker text={slide.type === "comparison" ? "Comparação" : slide.title} />
            {slide.type === "comparison" ? <Title text={slide.title} /> : null}
            {slide.subtitle && (
              <p className="text-[3em]" style={{ color: "var(--deck-muted)" }}>
                <RichText text={slide.subtitle} />
              </p>
            )}
          </div>
          <div className="flex flex-1 items-stretch gap-[3em]">
            {(slide.columns.length ? slide.columns : [{ heading: null, blocks: slide.blocks }]).map(
              (col, i) => (
                <Column key={i} column={col} />
              ),
            )}
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="flex size-full flex-col items-center justify-center gap-[3em] text-center">
          <span
            className="deck-display text-[18em] leading-[0.5]"
            style={{ color: "var(--deck-accent)" }}
            aria-hidden
          >
            &ldquo;
          </span>
          <div className="deck-display max-w-[82%] text-[5.4em] font-medium leading-tight">
            <RichText text={slide.title} />
          </div>
          {slide.subtitle && (
            <p className="text-[3em] uppercase tracking-[0.16em]" style={{ color: "var(--deck-muted)" }}>
              <RichText text={slide.subtitle} />
            </p>
          )}
        </div>
      );

    case "formula":
      return (
        <div className="flex size-full flex-col gap-[3em]">
          <Title text={slide.title} />
          <div className="flex flex-1 flex-col justify-center gap-[3em]">
            <BlocksRender blocks={slide.blocks} />
          </div>
        </div>
      );

    case "activity":
      return (
        <div className="flex size-full flex-col gap-[3em]">
          <div className="flex items-center gap-[2em]">
            <span
              className="rounded-full px-[2.6em] py-[1em] text-[2.4em] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: "var(--deck-accent)", color: "var(--deck-on-accent)" }}
            >
              Atividade
            </span>
          </div>
          <Title text={slide.title} />
          <div className="flex flex-1 flex-col justify-center gap-[2.4em]">
            <BlocksRender blocks={slide.blocks} />
          </div>
        </div>
      );

    case "summary":
      return (
        <div className="flex size-full flex-col gap-[3em]">
          <Kicker text="Síntese" />
          <Title text={slide.title} />
          <div className="flex flex-1 flex-col justify-center">
            <BlocksRender blocks={slide.blocks} />
          </div>
        </div>
      );

    case "content":
    default:
      return (
        <div className="flex size-full flex-col gap-[3.5em]">
          <div className="flex flex-col gap-[1em]">
            <Title text={slide.title} />
            {slide.subtitle && (
              <p className="text-[3.2em]" style={{ color: "var(--deck-muted)" }}>
                <RichText text={slide.subtitle} />
              </p>
            )}
          </div>
          <div className={cn("flex flex-1 gap-[4em]", hasImage ? "flex-row" : "flex-col")}>
            <div className="flex flex-1 flex-col justify-center gap-[2.4em]">
              <BlocksRender blocks={slide.blocks} />
            </div>
            {hasImage && (
              <div className="w-[38%] overflow-hidden rounded-[var(--deck-radius)]">
                <ImageView url={imageUrl} alt={imageAlt} />
              </div>
            )}
          </div>
        </div>
      );
  }
}
