import { randomBytes } from "node:crypto";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/env.js";
import { AiGenerationFailedError } from "../../domain/errors.js";
import type { ExtractionResult } from "../../domain/generation-types.js";
import type {
  GeneratedSlide,
  GeneratedSlideBlock,
  GeneratedSlideColumn,
  GeneratedSlideImage,
  RegenerateSlideResult,
  SlideDeckGenerationConfig,
  SlideDeckGenerationResult,
  SlideDeckGenerator,
  SlideGenerationProgress,
  SlideTheme,
} from "../../domain/slide-generation-types.js";
import { estimateCredits } from "../estimate-credits.js";
import { normalizeMathDelimiters } from "./normalize-math.js";
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
  buildRegenerateSlideUserPrompt,
  buildSlideSystemPrompt,
  buildSlideUserPrompt,
  type SlideOutlineItem,
} from "./slide-prompts/index.js";

const SLIDE_TYPES = [
  "cover",
  "section",
  "content",
  "two-column",
  "comparison",
  "quote",
  "formula",
  "activity",
  "summary",
] as const;

const THEMES = ["papel", "minimo", "lousa", "ludico", "vivido"] as const;

// Schema strict do outline (1ª chamada). Sem nullable/optional — strict mode do
// json_schema rejeita; campos vazios viram "" / [].
const outlineSchema = z.object({
  title: z.string(),
  subject: z.string(),
  gradeLevel: z.string(),
  suggestedTheme: z.enum(THEMES),
  slides: z.array(
    z.object({
      type: z.enum(SLIDE_TYPES),
      title: z.string(),
      intent: z.string(),
      needsImage: z.boolean(),
    }),
  ),
});

// Bloco "gordo": todos os campos presentes (strict), narrow por `kind` depois.
const blockSchema = z.object({
  kind: z.enum(["paragraph", "bullets", "formula", "callout"]),
  text: z.string(),
  emphasis: z.boolean(),
  items: z.array(z.string()),
  latex: z.string(),
  variant: z.enum(["term", "note", "example", "warning"]),
});

const columnSchema = z.object({
  heading: z.string(),
  blocks: z.array(blockSchema),
});

const slideSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  blocks: z.array(blockSchema),
  columns: z.array(columnSchema),
  image: z.object({
    query: z.string(),
    required: z.boolean(),
    alt: z.string(),
  }),
  notes: z.string(),
  bnccCodes: z.array(z.string()),
});

type RawBlock = z.infer<typeof blockSchema>;
type RawSlide = z.infer<typeof slideSchema>;

const MAX_MATERIAL_CHARS = 200_000;
const MATERIAL_TRUNCATION_NOTICE =
  "\n\n[...material truncado por exceder o limite de tamanho; componha a partir do trecho acima.]";

function capMaterial(material: string): string {
  if (material.length <= MAX_MATERIAL_CHARS) return material;
  return (
    material.slice(0, MAX_MATERIAL_CHARS - MATERIAL_TRUNCATION_NOTICE.length) +
    MATERIAL_TRUNCATION_NOTICE
  );
}

function joinMaterial(sources: ExtractionResult[]): string {
  if (sources.length === 0) return "";
  return capMaterial(
    sources.map((s) => `### ${s.sourceLabel}\n${s.text}`).join("\n\n"),
  );
}

// Tira delimitadores de cifrão de uma fórmula — o campo "latex" guarda só a
// expressão (o front renderiza via KaTeX sem cifrão).
function stripFormulaDelimiters(latex: string): string {
  return latex
    .trim()
    .replace(/^\${1,2}/, "")
    .replace(/\${1,2}$/, "")
    .trim();
}

// Narrow do bloco "gordo" pro bloco tagueado, normalizando matemática.
function toBlock(raw: RawBlock): GeneratedSlideBlock | null {
  switch (raw.kind) {
    case "paragraph": {
      const text = normalizeMathDelimiters(raw.text).trim();
      if (!text) return null;
      return { kind: "paragraph", text, emphasis: raw.emphasis };
    }
    case "bullets": {
      const items = raw.items
        .map((i) => normalizeMathDelimiters(i).trim())
        .filter(Boolean);
      if (items.length === 0) return null;
      return { kind: "bullets", items };
    }
    case "formula": {
      const latex = stripFormulaDelimiters(raw.latex);
      if (!latex) return null;
      return { kind: "formula", latex };
    }
    case "callout": {
      const text = normalizeMathDelimiters(raw.text).trim();
      if (!text) return null;
      return { kind: "callout", text, variant: raw.variant };
    }
    default:
      return null;
  }
}

function toBlocks(raw: RawBlock[]): GeneratedSlideBlock[] {
  return raw.map(toBlock).filter((b): b is GeneratedSlideBlock => b !== null);
}

function toColumns(raw: RawSlide["columns"]): GeneratedSlideColumn[] {
  return raw.map((c) => ({
    heading: c.heading.trim() || null,
    blocks: toBlocks(c.blocks),
  }));
}

function toImage(raw: RawSlide["image"]): GeneratedSlideImage | null {
  if (!raw.required || !raw.query.trim()) return null;
  // Campos resolvidos ficam null aqui — o pipeline (ImageProvider/Pexels) os
  // preenche depois.
  return {
    query: raw.query.trim(),
    required: true,
    alt: raw.alt.trim(),
    url: null,
    thumbUrl: null,
    photographer: null,
    photographerUrl: null,
    sourceUrl: null,
  };
}

function toSlide(raw: RawSlide, id: string): GeneratedSlide {
  return {
    id,
    type: "content", // overwritten by caller via outline
    title: normalizeMathDelimiters(raw.title).trim(),
    subtitle: raw.subtitle.trim() || null,
    blocks: toBlocks(raw.blocks),
    columns: toColumns(raw.columns),
    image: toImage(raw.image),
    notes: raw.notes.trim() || null,
    bnccCodes: raw.bnccCodes.map((c) => c.trim()).filter(Boolean),
  };
}

interface CallUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

function zeroUsage(): CallUsage {
  return { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
}

function addUsage(acc: CallUsage, next: CallUsage): void {
  acc.inputTokens += next.inputTokens;
  acc.outputTokens += next.outputTokens;
  acc.cachedInputTokens += next.cachedInputTokens;
}

export class OpenAiSlideDeckGenerator implements SlideDeckGenerator {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 4,
      timeout: 180_000,
    });
  }

  async generate(input: {
    config: SlideDeckGenerationConfig;
    sources: ExtractionResult[];
    onProgress?: (p: SlideGenerationProgress) => void;
  }): Promise<SlideDeckGenerationResult> {
    const material = joinMaterial(input.sources);
    const usage = zeroUsage();

    // 1ª chamada: roteiro (arco pedagógico + sugestão de tema + inferências).
    const outlineCompletion = await this.call({
      systemPrompt: buildOutlineSystemPrompt(input.config),
      userPrompt: buildOutlineUserPrompt({ config: input.config, material }),
      temperature: 0.4,
      schema: outlineSchema,
      schemaName: "slide_outline",
      maxTokens: 4_000,
    });
    addUsage(usage, outlineCompletion);
    const outlineParsed = outlineSchema.parse(outlineCompletion.json);

    const outline: SlideOutlineItem[] = outlineParsed.slides.map((s) => ({
      type: s.type,
      title: s.title,
      intent: s.intent,
      needsImage: s.needsImage,
    }));

    // 2ª..N: um slide por chamada, transmitido conforme chega.
    const slides: GeneratedSlide[] = [];
    for (let i = 0; i < outline.length; i++) {
      const slideCompletion = await this.call({
        systemPrompt: buildSlideSystemPrompt(input.config),
        userPrompt: buildSlideUserPrompt({
          config: input.config,
          material,
          outline,
          index: i,
        }),
        temperature: 0.5,
        schema: slideSchema,
        schemaName: "slide",
        maxTokens: 2_500,
      });
      addUsage(usage, slideCompletion);
      const raw = slideSchema.parse(slideCompletion.json);
      const slide = toSlide(raw, `s${i + 1}`);
      slide.type = outline[i]!.type; // tipo é decidido no roteiro
      slides.push(slide);
      input.onProgress?.({
        delivered: slides.length,
        requested: outline.length,
        slide,
      });
    }

    const subject =
      input.config.subject.trim() || outlineParsed.subject.trim();
    const gradeLevel =
      input.config.gradeLevel.trim() || outlineParsed.gradeLevel.trim();
    const title = input.config.title.trim() || outlineParsed.title.trim();

    return {
      title,
      subject,
      gradeLevel,
      tone: input.config.tone,
      suggestedTheme: outlineParsed.suggestedTheme as SlideTheme,
      slides,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        credits: estimateCredits(usage),
      },
    };
  }

  async regenerateSlide(input: {
    config: SlideDeckGenerationConfig;
    currentSlides: GeneratedSlide[];
    slideId: string;
    sources: ExtractionResult[];
  }): Promise<RegenerateSlideResult> {
    const material = joinMaterial(input.sources);
    const index = input.currentSlides.findIndex((s) => s.id === input.slideId);
    if (index === -1) {
      throw new AiGenerationFailedError("Slide alvo não está no deck.");
    }

    const completion = await this.call({
      systemPrompt: buildSlideSystemPrompt(input.config),
      userPrompt: buildRegenerateSlideUserPrompt({
        config: input.config,
        currentSlides: input.currentSlides,
        index,
        material,
      }),
      temperature: 0.6,
      schema: slideSchema,
      schemaName: "slide",
      maxTokens: 2_500,
    });

    const raw = slideSchema.parse(completion.json);
    const slide = toSlide(raw, input.slideId);
    slide.type = input.currentSlides[index]!.type;

    return {
      slide,
      usage: {
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        credits: estimateCredits(completion),
      },
    };
  }

  // Uma chamada OpenAI com structured output. Centraliza parse + tratamento de
  // erro. Espelha o `call` do OpenAiLessonPlanGenerator.
  private async call(input: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    schema: z.ZodTypeAny;
    schemaName: string;
    maxTokens: number;
  }): Promise<{
    json: unknown;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  }> {
    let rawContent: string | null = null;
    try {
      const completion = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        response_format: zodResponseFormat(input.schema, input.schemaName),
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      });

      const message = completion.choices[0]?.message;
      if (!message) throw new AiGenerationFailedError("Resposta da IA veio vazia.");
      if (message.refusal) {
        throw new AiGenerationFailedError(
          `IA recusou gerar a partir deste material: ${message.refusal}`,
        );
      }
      rawContent = message.content;
      if (!rawContent) throw new AiGenerationFailedError("Resposta da IA veio vazia.");

      let json: unknown;
      try {
        json = JSON.parse(rawContent);
      } catch {
        throw new AiGenerationFailedError("Resposta da IA não é JSON válido.");
      }

      return {
        json,
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
        cachedInputTokens:
          completion.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      };
    } catch (err) {
      if (err instanceof AiGenerationFailedError) throw err;
      if (err instanceof z.ZodError) {
        console.error(
          "[ai-ops] Resposta de slide não bateu com schema",
          JSON.stringify(
            { issues: err.issues, rawPreview: rawContent?.slice(0, 2000) ?? null },
            null,
            2,
          ),
        );
        throw new AiGenerationFailedError(
          "Resposta da IA não bateu com o formato esperado.",
        );
      }
      const e = err as { name?: string; message?: string; status?: number; code?: string };
      console.error("[ai-ops] OpenAI slide-deck falhou", {
        name: e.name,
        status: e.status,
        code: e.code,
        message: e.message,
      });
      throw new AiGenerationFailedError(
        `Falha ao chamar OpenAI: ${e.message ?? e.name ?? "erro desconhecido"}`,
      );
    }
  }
}
