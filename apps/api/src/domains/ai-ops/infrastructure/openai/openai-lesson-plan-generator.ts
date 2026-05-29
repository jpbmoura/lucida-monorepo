import { randomBytes } from "node:crypto";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/env.js";
import { AiGenerationFailedError } from "../../domain/errors.js";
import type { ExtractionResult } from "../../domain/generation-types.js";
import type {
  GeneratedLessonPlan,
  LessonPlanBlockKey,
  LessonPlanGenerationConfig,
  LessonPlanGenerationResult,
  LessonPlanGenerator,
  RegenerateBlockResult,
} from "../../domain/lesson-plan-generation-types.js";
import { ARRAY_BLOCK_KEYS } from "../../domain/lesson-plan-generation-types.js";
import { estimateCredits } from "../estimate-credits.js";
import {
  buildRegenerateBlockUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  getSegmentSpec,
} from "./lesson-plan-prompts/index.js";

// Schema strict do plano completo. Sem nullable (strict mode do json_schema
// rejeita), sem .min/.max — campos não aplicáveis vêm como [] / "" por
// instrução do prompt, e normalizamos depois.
const strictPlanSchema = z.object({
  // Disciplina/área e nível: ecoam o que o professor informou ou, quando em
  // branco, são inferidos do material. Ficam fora do GeneratedLessonPlan (são
  // identificação, não bloco de conteúdo) — o gerador os extrai pro resultado.
  subject: z.string(),
  level: z.string(),
  objectives: z.array(z.string()),
  bnccSkills: z.array(
    z.object({ code: z.string(), description: z.string() }),
  ),
  content: z.string(),
  methodology: z.string(),
  resources: z.array(z.string()),
  introduction: z.string(),
  development: z.string(),
  conclusion: z.string(),
  assessment: z.string(),
  bibliography: z.array(z.string()),
});

// Mesmo teto de material das provas — ~200k chars cobrem o context window com
// folga pro plano de saída.
const MAX_MATERIAL_CHARS = 200_000;
const MATERIAL_TRUNCATION_NOTICE =
  "\n\n[...material truncado por exceder o limite de tamanho; planeje a partir do trecho acima.]";

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

export class OpenAiLessonPlanGenerator implements LessonPlanGenerator {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 4,
      timeout: 180_000,
    });
  }

  async generate(input: {
    config: LessonPlanGenerationConfig;
    sources: ExtractionResult[];
  }): Promise<LessonPlanGenerationResult> {
    const spec = getSegmentSpec(input.config.segment);
    const material = joinMaterial(input.sources);
    const nonce = randomBytes(8).toString("hex");

    const completion = await this.call({
      systemPrompt: buildSystemPrompt(input.config.segment, input.config.language),
      userPrompt: buildUserPrompt({ config: input.config, material, nonce }),
      temperature: spec.temperature,
      schema: strictPlanSchema,
      schemaName: "lesson_plan",
    });

    const parsed = strictPlanSchema.parse(completion.json);

    // Normaliza políticas do segmento: BNCC só K-12, bibliografia conforme
    // a política. Cinto+suspensório caso o modelo ignore a instrução.
    const bnccSkills =
      spec.bnccPolicy === "required" ? parsed.bnccSkills : [];
    const bibliography =
      spec.bibliographyPolicy === "none" ? [] : parsed.bibliography;

    const plan: GeneratedLessonPlan = {
      objectives: parsed.objectives,
      bnccSkills,
      // MVP: sugestão da IA, nunca validada contra base própria (decisão
      // "decidir depois"). A UI mostra "confira".
      bnccVerified: false,
      content: parsed.content,
      methodology: parsed.methodology,
      resources: parsed.resources,
      introduction: parsed.introduction,
      development: parsed.development,
      conclusion: parsed.conclusion,
      assessment: parsed.assessment,
      bibliography,
    };

    // Prefere o valor informado pelo professor; cai pro inferido pela IA
    // quando veio em branco.
    const subject = input.config.subject.trim() || parsed.subject.trim();
    const level = input.config.level.trim() || parsed.level.trim();

    return {
      plan,
      subject,
      level,
      usage: {
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        credits: estimateCredits({
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          cachedInputTokens: completion.cachedInputTokens,
        }),
      },
    };
  }

  async regenerateBlock(input: {
    config: LessonPlanGenerationConfig;
    currentPlan: GeneratedLessonPlan;
    blockKey: LessonPlanBlockKey;
    sources: ExtractionResult[];
  }): Promise<RegenerateBlockResult> {
    const spec = getSegmentSpec(input.config.segment);
    const material = joinMaterial(input.sources);
    const nonce = randomBytes(8).toString("hex");

    const isArray = ARRAY_BLOCK_KEYS.includes(input.blockKey);
    // Schema com só a chave alvo. Strict mode aceita um único campo.
    const blockSchema = z.object(
      isArray
        ? { [input.blockKey]: z.array(z.string()) }
        : { [input.blockKey]: z.string() },
    );

    const completion = await this.call({
      systemPrompt: buildSystemPrompt(input.config.segment, input.config.language),
      userPrompt: buildRegenerateBlockUserPrompt({
        config: input.config,
        currentPlan: input.currentPlan,
        blockKey: input.blockKey,
        material,
        nonce,
      }),
      temperature: spec.temperature,
      schema: blockSchema,
      schemaName: "lesson_plan_block",
    });

    const parsed = blockSchema.parse(completion.json) as Record<string, unknown>;
    const block = { [input.blockKey]: parsed[input.blockKey] } as Partial<GeneratedLessonPlan>;

    return {
      block,
      usage: {
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        credits: estimateCredits({
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          cachedInputTokens: completion.cachedInputTokens,
        }),
      },
    };
  }

  // Uma chamada OpenAI com structured output. Centraliza parse + tratamento de
  // erro pra generate e regenerateBlock.
  private async call(input: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    schema: z.ZodTypeAny;
    schemaName: string;
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
        max_tokens: 8_000,
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
          "[ai-ops] Resposta de plano não bateu com schema",
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
      console.error("[ai-ops] OpenAI lesson-plan falhou", {
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
