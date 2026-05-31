"use client";

import type { Slide, SlideBlock, SlideTheme } from "../types";

// Export PPTX client-side via pptxgenjs. Mapeia cada bloco do schema pra
// elementos nativos (caixas de texto, bullets, imagens embutidas). Fórmulas no
// v1 saem como texto monospaçado legível (OMML fica pra depois). Imagens são
// baixadas e EMBUTIDAS na hora do export (sem hotlink no arquivo final).

interface PptxTheme {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
}

const PPTX_THEMES: Record<SlideTheme, PptxTheme> = {
  papel: { bg: "F4EFE3", ink: "1B2A24", muted: "5C6B62", accent: "0E8C6F" },
  minimo: { bg: "FBFAF7", ink: "15161A", muted: "6C6E78", accent: "B0542E" },
  lousa: { bg: "13171B", ink: "E9EEF2", muted: "97A4AE", accent: "2DD4BF" },
  ludico: { bg: "FFF7E8", ink: "2A2140", muted: "6B6385", accent: "FF8A3D" },
  vivido: { bg: "F6F7FB", ink: "0E1A2B", muted: "5A6678", accent: "2348F0" },
};

// Slide 16:9 padrão do pptxgenjs (LAYOUT_WIDE): 13.33 x 7.5 polegadas.
const W = 13.33;
const H = 7.5;
const PAD = 0.7;

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function blocksToText(blocks: SlideBlock[]): { text: string; options: Record<string, unknown> }[] {
  const out: { text: string; options: Record<string, unknown> }[] = [];
  for (const block of blocks) {
    if (block.kind === "paragraph") {
      out.push({ text: block.text, options: { bullet: false, paraSpaceAfter: 8, bold: block.emphasis } });
    } else if (block.kind === "bullets") {
      for (const item of block.items) {
        out.push({ text: item, options: { bullet: true, paraSpaceAfter: 6 } });
      }
    } else if (block.kind === "formula") {
      out.push({ text: block.latex, options: { bullet: false, fontFace: "Consolas", paraSpaceAfter: 8 } });
    } else if (block.kind === "callout") {
      out.push({ text: block.text, options: { bullet: false, italic: true, paraSpaceAfter: 8 } });
    }
  }
  return out;
}

export async function exportDeckToPptx(deck: {
  title: string;
  slides: Slide[];
  theme: SlideTheme;
}): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const t = PPTX_THEMES[deck.theme];

  for (const slide of deck.slides) {
    const s = pptx.addSlide();
    s.background = { color: t.bg };

    const centered = slide.type === "cover" || slide.type === "section" || slide.type === "quote";
    const imageData =
      slide.image?.url && !centered ? await fetchAsDataUrl(slide.image.url) : null;
    const bodyW = imageData ? (W - PAD * 2) * 0.58 : W - PAD * 2;

    if (centered) {
      s.addText(slide.title, {
        x: PAD,
        y: H / 2 - 1.2,
        w: W - PAD * 2,
        h: 2.4,
        fontSize: slide.type === "cover" ? 44 : 40,
        bold: true,
        align: "center",
        color: t.ink,
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: PAD,
          y: H / 2 + 1.2,
          w: W - PAD * 2,
          h: 0.8,
          fontSize: 18,
          align: "center",
          color: t.muted,
        });
      }
      continue;
    }

    s.addText(slide.title, {
      x: PAD,
      y: PAD,
      w: W - PAD * 2,
      h: 1,
      fontSize: 30,
      bold: true,
      color: t.ink,
      fit: "shrink",
    });

    const body = slide.columns.length
      ? blocksToText(slide.columns.flatMap((c) => c.blocks))
      : blocksToText(slide.blocks);
    if (body.length) {
      s.addText(body as never, {
        x: PAD,
        y: PAD + 1.2,
        w: bodyW,
        h: H - PAD * 2 - 1.2,
        fontSize: 16,
        color: t.ink,
        valign: "top",
        // Encolhe o texto pra caber na caixa (paridade com o auto-fit do web).
        fit: "shrink",
      });
    }

    if (imageData) {
      s.addImage({
        data: imageData,
        x: PAD + bodyW + 0.4,
        y: PAD + 1.2,
        w: W - PAD * 2 - bodyW - 0.4,
        h: H - PAD * 2 - 1.2,
        sizing: { type: "cover", w: W - PAD * 2 - bodyW - 0.4, h: H - PAD * 2 - 1.2 },
      });
    }
  }

  const safeName = (deck.title || "apresentacao").replace(/[^\wÀ-ſ -]/g, "").trim() || "apresentacao";
  await pptx.writeFile({ fileName: `${safeName}.pptx` });
}
