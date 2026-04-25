import OpenAI from "openai";
import { z } from "zod";
import { env } from "@/env.js";
import { AiGenerationFailedError } from "../../domain/errors.js";
import type {
  QuestionGenerator,
  GenerationConfig,
  ExtractionResult,
  GenerationResult,
} from "../../domain/generation-types.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts/index.js";
import { estimateCredits } from "../estimate-credits.js";

const responseSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.enum(["multipleChoice", "trueFalse"]),
        statement: z.string().min(3),
        context: z.string().nullable(),
        options: z.array(z.string()).min(2).max(6),
        correctAnswer: z.number().int().nonnegative(),
        explanation: z.string(),
        difficulty: z.enum(["fácil", "médio", "difícil"]),
      }),
    )
    .min(1),
});

export class OpenAiQuestionGenerator implements QuestionGenerator {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async generate(input: {
    config: GenerationConfig;
    sources: ExtractionResult[];
    avoidStatements?: string[];
  }): Promise<GenerationResult> {
    const material = input.sources
      .map((s) => `### ${s.sourceLabel}\n${s.text}`)
      .join("\n\n");

    const systemPrompt = buildSystemPrompt(input.config.style);
    const userPrompt = buildUserPrompt({
      config: input.config,
      material,
      avoidStatements: input.avoidStatements,
    });

    try {
      const completion = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new AiGenerationFailedError("Resposta da IA veio vazia.");
      }

      const parsed = safeJsonParse(content);
      const validated = responseSchema.parse(parsed);

      // Sanity check: valida que correctAnswer está no range das options.
      for (const q of validated.questions) {
        if (q.correctAnswer >= q.options.length) {
          throw new AiGenerationFailedError(
            "Questão gerada com correctAnswer fora do range.",
          );
        }
      }

      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;

      return {
        questions: validated.questions,
        usage: {
          inputTokens,
          outputTokens,
          credits: estimateCredits({ inputTokens, outputTokens }),
        },
      };
    } catch (err) {
      if (err instanceof AiGenerationFailedError) throw err;
      if (err instanceof z.ZodError) {
        throw new AiGenerationFailedError(
          "Resposta da IA não bateu com o formato esperado.",
        );
      }
      throw new AiGenerationFailedError(
        `Falha ao chamar OpenAI: ${(err as Error).message}`,
      );
    }
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new AiGenerationFailedError("Resposta da IA não é JSON válido.");
  }
}
