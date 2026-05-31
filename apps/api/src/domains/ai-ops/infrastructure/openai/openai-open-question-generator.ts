import { randomBytes, randomUUID } from "node:crypto";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/env.js";
import { AiGenerationFailedError } from "../../domain/errors.js";
import type { ExtractionResult, GenerationProgress } from "../../domain/generation-types.js";
import type {
  GeneratedOpenQuestion,
  OpenGenerationConfig,
  OpenGenerationResult,
  OpenQuestionGenerator,
} from "../../domain/open-generation-types.js";
import {
  buildOpenSystemPrompt,
  buildOpenUserPrompt,
} from "./prompts/open-question/guide.js";

const MATERIAL_CHAR_CAP = 200_000;

// Schema strict pro Structured Outputs: sem nullable/min/max. Ids da rubrica
// são gerados no servidor depois do parse (a IA não precisa inventá-los).
const strictSchema = z.object({
  questions: z.array(
    z.object({
      statement: z.string(),
      context: z.string(),
      referenceAnswer: z.string(),
      difficulty: z.enum(["fácil", "médio", "difícil"]),
      rubric: z.object({
        criteria: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            levels: z.array(
              z.object({
                label: z.string(),
                points: z.number().int(),
                descriptor: z.string(),
              }),
            ),
          }),
        ),
      }),
    }),
  ),
});

export class OpenAiOpenQuestionGenerator implements OpenQuestionGenerator {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 4,
      timeout: 180_000,
    });
  }

  async generate(input: {
    config: OpenGenerationConfig;
    sources: ExtractionResult[];
    avoidStatements?: string[];
    onProgress?: (p: GenerationProgress) => void;
  }): Promise<OpenGenerationResult> {
    const material = capMaterial(
      input.sources.map((s) => `### ${s.sourceLabel}\n${s.text}`).join("\n\n"),
    );
    const nonce = randomBytes(8).toString("hex");

    const systemPrompt = buildOpenSystemPrompt(input.config.language);
    const userPrompt = buildOpenUserPrompt({
      config: input.config,
      material,
      nonce,
      avoidStatements: input.avoidStatements,
    });

    let rawContent: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const completion = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0.4,
        max_tokens: Math.min(16_000, input.config.questionCount * 700 + 1000),
        response_format: zodResponseFormat(strictSchema, "open_questions"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const message = completion.choices[0]?.message;
      if (!message) throw new AiGenerationFailedError("Resposta da IA veio vazia.");
      if (message.refusal) {
        throw new AiGenerationFailedError(
          `IA recusou gerar a partir deste material: ${message.refusal}`,
        );
      }
      rawContent = message.content;
      inputTokens = completion.usage?.prompt_tokens ?? 0;
      outputTokens = completion.usage?.completion_tokens ?? 0;
    } catch (err) {
      if (err instanceof AiGenerationFailedError) throw err;
      throw new AiGenerationFailedError((err as Error).message);
    }

    if (!rawContent) throw new AiGenerationFailedError("Resposta da IA veio vazia.");
    let parsed: z.infer<typeof strictSchema>;
    try {
      parsed = strictSchema.parse(JSON.parse(rawContent));
    } catch {
      throw new AiGenerationFailedError("Saída da geração fora do contrato.");
    }

    const questions = parsed.questions
      .map(toOpenQuestion)
      .filter((q): q is GeneratedOpenQuestion => q !== null);

    if (questions.length === 0) {
      throw new AiGenerationFailedError(
        "A IA não conseguiu gerar questões discursivas a partir deste material.",
      );
    }

    input.onProgress?.({
      round: 1,
      totalRounds: 1,
      delivered: questions.length,
      requested: input.config.questionCount,
    });

    return {
      questions,
      usage: { inputTokens, outputTokens, credits: 0 },
    };
  }
}

// Converte a saída crua numa questão válida: adiciona ids estáveis, "" → null,
// descarta rubricas degeneradas (sem critério ou critério com < 2 níveis).
function toOpenQuestion(
  raw: z.infer<typeof strictSchema>["questions"][number],
): GeneratedOpenQuestion | null {
  const statement = raw.statement.trim();
  if (statement.length < 3) return null;

  const criteria = raw.rubric.criteria
    .filter((c) => c.name.trim().length > 0 && c.levels.length >= 2)
    .map((c) => ({
      id: randomUUID(),
      name: c.name.trim(),
      description: c.description.trim() || null,
      levels: c.levels.map((l) => ({
        id: randomUUID(),
        label: l.label.trim() || "Nível",
        points: Math.max(0, Math.round(l.points)),
        descriptor: l.descriptor.trim(),
      })),
    }));

  if (criteria.length === 0) return null;

  return {
    statement,
    context: raw.context.trim() || null,
    referenceAnswer: raw.referenceAnswer.trim() || null,
    rubric: { criteria },
    difficulty: raw.difficulty,
  };
}

function capMaterial(material: string): string {
  if (material.length <= MATERIAL_CHAR_CAP) return material;
  return `${material.slice(0, MATERIAL_CHAR_CAP)}\n\n[material truncado]`;
}
