import type {
  GeneratedSlide,
  GeneratedSlideBlock,
} from "../domain/slide-generation-types.js";

// Divide slides densos demais em slides de continuação, ANTES de salvar. É a
// metade "B" da estratégia anti-overflow: mantém a fonte legível (em vez de
// encolher tudo). O auto-fit no front é a garantia dura final; este split
// reduz o quanto ele precisa atuar. Heurística por "linhas estimadas" — só
// divide tipos de conteúdo corrido (não capa/seção/citação/colunas).

const SPLITTABLE = new Set<GeneratedSlide["type"]>([
  "content",
  "summary",
  "activity",
  "formula",
]);

// Orçamento generoso de linhas de corpo (fora título/subtítulo). Conservador de
// propósito: só divide quando claramente estoura — o auto-fit cobre o resto.
const MAX_BODY_LINES = 9;
const CHARS_PER_LINE = 50;

function lines(chars: number, perLine = CHARS_PER_LINE): number {
  return Math.max(1, Math.ceil(chars / perLine));
}

function blockLines(block: GeneratedSlideBlock): number {
  switch (block.kind) {
    case "paragraph":
      return lines(block.text.length) + (block.emphasis ? 1 : 0);
    case "bullets":
      return block.items.reduce((sum, i) => sum + lines(i.length, 48), 0);
    case "formula":
      return 2;
    case "callout":
      return 2 + lines(block.text.length, 45);
    default:
      return 1;
  }
}

function splitOne(slide: GeneratedSlide): GeneratedSlide[] {
  if (!SPLITTABLE.has(slide.type) || slide.blocks.length <= 1) return [slide];

  const subtitleLines = slide.subtitle ? lines(slide.subtitle.length) : 0;
  const budget = Math.max(MAX_BODY_LINES - subtitleLines, 3);

  const groups: GeneratedSlideBlock[][] = [];
  let current: GeneratedSlideBlock[] = [];
  let used = 0;
  for (const block of slide.blocks) {
    const w = blockLines(block);
    if (current.length > 0 && used + w > budget) {
      groups.push(current);
      current = [];
      used = 0;
    }
    current.push(block);
    used += w;
  }
  if (current.length) groups.push(current);
  if (groups.length <= 1) return [slide];

  return groups.map((blocks, i) =>
    i === 0
      ? { ...slide, blocks }
      : {
          ...slide,
          id: `${slide.id}_${i}`,
          type: "content",
          title: `${slide.title} (cont.)`,
          subtitle: null,
          blocks,
          columns: [],
          image: null,
          notes: null,
          bnccCodes: [],
        },
  );
}

export function splitOverflowingSlides(
  slides: GeneratedSlide[],
): GeneratedSlide[] {
  const out = slides.flatMap(splitOne);
  // Re-sequencia os ids (s1..sN) pra manter consistência com o resto do app.
  return out.map((slide, i) => ({ ...slide, id: `s${i + 1}` }));
}
