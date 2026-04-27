import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
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

// Schema "limpa" usada como contrato pro structured output da OpenAI.
// Sem .min/.max, sem transform/refine, **sem nullable** — strict mode do
// json_schema rejeita `nullable: true` (é extension do OpenAPI, não JSON
// Schema). Modelo emite string vazia quando o estilo não usa contexto;
// o parser tolerante mais abaixo converte "" → null pro shape interno.
const strictResponseSchema = z.object({
  questions: z.array(
    z.object({
      type: z.enum(["multipleChoice", "trueFalse"]),
      statement: z.string(),
      context: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.number().int(),
      explanation: z.string(),
      difficulty: z.enum(["fácil", "médio", "difícil"]),
    }),
  ),
});

// Schema tolerante usada no parse de runtime — cinto+suspensório.
// Mesmo com structured outputs, normalizamos drift comum (capitalização,
// acento, sinônimos) e campos opcionais omitidos. Se algo passar pelo
// strict mode com forma esquisita, esta camada resolve em vez de quebrar.
const tolerantResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z
          .string()
          .transform((value, ctx) => {
            const normalized = TYPE_ALIASES[normalizeKey(value)];
            if (!normalized) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `type não reconhecido: ${value}`,
              });
              return z.NEVER;
            }
            return normalized;
          }),
        statement: z.string().min(1),
        context: z
          .string()
          .nullable()
          .optional()
          .transform((v) => {
            // Strict mode força string. Convertemos "" e undefined em null
            // pra manter o shape interno (Question.context: string | null).
            if (v === undefined || v === null) return null;
            const trimmed = v.trim();
            return trimmed === "" ? null : trimmed;
          }),
        options: z.array(z.string()).min(2).max(6),
        correctAnswer: z.coerce.number().int().nonnegative(),
        explanation: z.string().optional().default(""),
        difficulty: z
          .string()
          .transform((value, ctx) => {
            const normalized = DIFFICULTY_ALIASES[normalizeKey(value)];
            if (!normalized) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `difficulty não reconhecida: ${value}`,
              });
              return z.NEVER;
            }
            return normalized;
          }),
      }),
    )
    .min(1),
});

const TYPE_ALIASES: Record<string, "multipleChoice" | "trueFalse"> = {
  multiplechoice: "multipleChoice",
  multiple_choice: "multipleChoice",
  "multiple-choice": "multipleChoice",
  mc: "multipleChoice",
  multiplaescolha: "multipleChoice",
  multipla_escolha: "multipleChoice",
  "multipla-escolha": "multipleChoice",
  truefalse: "trueFalse",
  true_false: "trueFalse",
  "true-false": "trueFalse",
  vf: "trueFalse",
  verdadeirofalso: "trueFalse",
  verdadeiro_falso: "trueFalse",
  "verdadeiro-falso": "trueFalse",
};

const DIFFICULTY_ALIASES: Record<string, "fácil" | "médio" | "difícil"> = {
  facil: "fácil",
  easy: "fácil",
  medio: "médio",
  medium: "médio",
  dificil: "difícil",
  hard: "difícil",
};

/** Normaliza string pra chave: lowercase + remove diacríticos + trim. */
function normalizeKey(s: string): string {
  // U+0300..U+036F = combining diacritical marks. Escape unicode evita
  // depender da fidelidade do editor a chars combinantes na fonte.
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

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

    let rawContent: string | null = null;
    try {
      const completion = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // Structured Outputs: força a OpenAI a emitir JSON válido contra
        // o schema. Funciona em gpt-4o, gpt-4o-mini, gpt-4.1+. Elimina drift
        // de enum (capitalização, acento, sinônimo).
        response_format: zodResponseFormat(
          strictResponseSchema,
          "exam_questions",
        ),
        temperature: 0.7,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new AiGenerationFailedError("Resposta da IA veio vazia.");
      }
      if (message.refusal) {
        throw new AiGenerationFailedError(
          `IA recusou gerar a partir deste material: ${message.refusal}`,
        );
      }
      rawContent = message.content;
      if (!rawContent) {
        throw new AiGenerationFailedError("Resposta da IA veio vazia.");
      }

      const parsedJson = safeJsonParse(rawContent);
      const validated = tolerantResponseSchema.parse(parsedJson);

      // Sanity check: correctAnswer dentro do range das options. Não cabe
      // em JSON Schema strict, então validamos aqui.
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
        // Diagnóstico: log raw + issues. Trunca pra não estourar console em
        // resposta longa. Sem isso fica impossível debugar quando volta a
        // dar erro num material esquisito.
        console.error(
          "[ai-ops] Resposta da IA não bateu com schema",
          JSON.stringify(
            {
              issues: err.issues,
              rawPreview: rawContent ? rawContent.slice(0, 2000) : null,
            },
            null,
            2,
          ),
        );
        throw new AiGenerationFailedError(
          "Resposta da IA não bateu com o formato esperado.",
        );
      }
      // Erro genérico (provavelmente OpenAI APIError). Log shape inteiro
      // pra a próxima falha já dar pra ver status/code/body sem reprozar.
      const e = err as {
        name?: string;
        message?: string;
        status?: number;
        code?: string;
        type?: string;
      };
      console.error("[ai-ops] OpenAI generate falhou", {
        name: e.name,
        status: e.status,
        code: e.code,
        type: e.type,
        message: e.message,
      });
      throw new AiGenerationFailedError(
        `Falha ao chamar OpenAI: ${e.message ?? e.name ?? "erro desconhecido"}`,
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
