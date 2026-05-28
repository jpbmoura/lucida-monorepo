import { randomBytes } from "node:crypto";
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
  GeneratedQuestion,
  GenerationProgress,
} from "../../domain/generation-types.js";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getStyleSpec,
} from "./prompts/index.js";
import { estimateCredits } from "../estimate-credits.js";
import { normalizeMathDelimiters } from "./normalize-math.js";
import {
  FILL_MODE_STALE_LIMIT,
  QUESTION_BATCH_SIZE,
} from "./generation-tuning.js";

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

// R4 — teto de material. Sem isso, um PDF de 25 MB estoura o context
// window (erro 502) ou dispara custo/latência sem teto. ~200k chars ≈ 55k
// tokens (heurística pt-BR 3.6 chars/token), deixando folga pro system
// prompt + output mesmo com 50 questões. Truncamos com aviso explícito pra
// a IA saber que o material está cortado.
const MAX_MATERIAL_CHARS = 200_000;
const MATERIAL_TRUNCATION_NOTICE =
  "\n\n[...material truncado por exceder o limite de tamanho; gere as questões a partir do trecho acima.]";

// R4 — teto de output. Orçamento generoso por questão + buffer, com cap
// duro pra um questionCount alto não virar uma resposta ilimitada.
function maxOutputTokens(questionCount: number): number {
  return Math.min(16_384, questionCount * 400 + 1_000);
}

function capMaterial(material: string): string {
  if (material.length <= MAX_MATERIAL_CHARS) return material;
  return (
    material.slice(0, MAX_MATERIAL_CHARS - MATERIAL_TRUNCATION_NOTICE.length) +
    MATERIAL_TRUNCATION_NOTICE
  );
}

export class OpenAiQuestionGenerator implements QuestionGenerator {
  private readonly client: OpenAI;

  constructor() {
    // R14 — resiliência. O SDK já faz backoff exponencial em 429/5xx/rede;
    // tornamos explícito e um pouco mais agressivo (geração é cara de
    // refazer) + timeout por chamada pra não pendurar o SSE.
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 4,
      timeout: 90_000,
    });
  }

  async generate(input: {
    config: GenerationConfig;
    sources: ExtractionResult[];
    avoidStatements?: string[];
    onProgress?: (p: GenerationProgress) => void;
  }): Promise<GenerationResult> {
    const material = capMaterial(
      input.sources
        .map((s) => `### ${s.sourceLabel}\n${s.text}`)
        .join("\n\n"),
    );

    const expectedCount = input.config.questionCount;
    const collected: GeneratedQuestion[] = [];
    const seenStatements = new Set<string>();
    // avoid do chamador (regenerate) entra como base; as questões geradas
    // aqui vão sendo somadas a cada rodada.
    const avoid = [...(input.avoidStatements ?? [])];

    let inputTokens = 0;
    let outputTokens = 0;
    let cachedInputTokens = 0;

    // Nonce único da geração inteira — mantém o bloco de material idêntico
    // entre lotes pra o prompt caching da OpenAI reaproveitar o prefixo.
    const nonce = randomBytes(8).toString("hex");

    // Garantia dura de N: geramos em lotes pequenos até fechar a quantidade
    // pedida, em vez de pedir tudo numa chamada (estoura timeout/teto de
    // tokens) ou aceitar shortfall. Backstop pra não rodar pra sempre num
    // caso patológico de material quase vazio (já barrado por
    // MIN_MEANINGFUL_CHARS no collect-sources).
    const plannedBatches = Math.max(
      1,
      Math.ceil(expectedCount / QUESTION_BATCH_SIZE),
    );
    const maxCalls = plannedBatches + 12;
    let calls = 0;
    let staleStreak = 0;
    let fillMode = false;

    while (collected.length < expectedCount && calls < maxCalls) {
      calls++;
      const remaining = expectedCount - collected.length;
      const requestCount = Math.min(QUESTION_BATCH_SIZE, remaining);

      let roundResult: Awaited<ReturnType<typeof this.runRound>>;
      try {
        roundResult = await this.runRound({
          config: input.config,
          material,
          requestCount,
          avoidStatements: avoid,
          fillMode,
          nonce,
        });
      } catch (err) {
        // Falha já depois dos retries do SDK. Se a 1ª chamada falhou sem nada
        // coletado, é erro real → propaga pro usuário. Senão, não jogamos a
        // geração fora: pula o lote e segue tentando fechar N.
        if (collected.length === 0) throw err;
        console.warn("[ai-ops] lote falhou; seguindo pra fechar N", {
          call: calls,
          collected: collected.length,
          requested: expectedCount,
          message: (err as Error).message,
        });
        staleStreak++;
        if (staleStreak >= FILL_MODE_STALE_LIMIT) fillMode = true;
        continue;
      }

      inputTokens += roundResult.inputTokens;
      outputTokens += roundResult.outputTokens;
      cachedInputTokens += roundResult.cachedInputTokens;

      let added = 0;
      for (const q of roundResult.questions) {
        if (collected.length >= expectedCount) break;
        // Dedupe por enunciado normalizado — evita gastar slot com repetição
        // exata quando o modelo ignora parcialmente o avoid.
        const key = normalizeKey(q.statement);
        if (seenStatements.has(key)) continue;
        seenStatements.add(key);
        collected.push(q);
        avoid.push(q.statement);
        added++;
      }

      input.onProgress?.({
        round: calls,
        totalRounds: Math.max(plannedBatches, calls),
        delivered: collected.length,
        requested: expectedCount,
      });

      // Lote sem nada novo → material rendendo pouco. Depois de alguns lotes
      // secos, liga o fill mode (relaxa a não-redundância) pra ainda assim
      // fechar N. Uma vez ligado, fica ligado — o material já se mostrou raso.
      if (added === 0) {
        staleStreak++;
        if (staleStreak >= FILL_MODE_STALE_LIMIT) fillMode = true;
      } else {
        staleStreak = 0;
      }
    }

    if (collected.length === 0) {
      throw new AiGenerationFailedError(
        "A IA não devolveu nenhuma questão utilizável.",
      );
    }

    if (collected.length < expectedCount) {
      // Só chega aqui no caso patológico do backstop (material quase vazio).
      // Entregamos o máximo em vez de 502, mas logamos alto — a garantia dura
      // deveria ter fechado N.
      console.warn("[ai-ops] shortfall após backstop de lotes", {
        requested: expectedCount,
        delivered: collected.length,
        calls,
        style: input.config.style,
      });
    }

    const questions = collected.slice(0, expectedCount);

    // R9 (telemetria) — confronta o rótulo de dificuldade com o pedido.
    // Custo zero (só inspeciona o que já foi gerado), sem override (não
    // mascara o problema A) e sem rejeitar (não regenera caro). Mede pra
    // decidir enforcement v2 se o dado pedir. Mesma disciplina do R2.
    {
      const counts = { fácil: 0, médio: 0, difícil: 0 } as Record<
        "fácil" | "médio" | "difícil",
        number
      >;
      for (const q of questions) counts[q.difficulty]++;
      const requested = input.config.difficulty;
      if (requested === "misto") {
        const distinct = (["fácil", "médio", "difícil"] as const).filter(
          (k) => counts[k] > 0,
        ).length;
        console.log("[ai-ops][r9-difficulty]", {
          mode: "misto",
          total: questions.length,
          labelCounts: counts,
          // promessa do prompt: ≥1 de cada quando N≥3
          mistoOk: questions.length < 3 ? true : distinct === 3,
        });
      } else {
        const mismatch = questions.filter(
          (q) => q.difficulty !== requested,
        ).length;
        if (mismatch > 0) {
          console.log("[ai-ops][r9-difficulty]", {
            mode: "fixed",
            requested,
            total: questions.length,
            labelCounts: counts,
            mismatchVsRequested: mismatch,
          });
        }
      }
    }

    return {
      questions,
      usage: {
        inputTokens,
        outputTokens,
        // Tokens de input cacheados (lotes 2+ reaproveitam o prefixo) custam
        // menos — repassamos o desconto pro crédito cobrado do professor.
        credits: estimateCredits({
          inputTokens,
          outputTokens,
          cachedInputTokens,
        }),
      },
    };
  }

  // Um lote = uma chamada OpenAI + parse + validação de shape por questão
  // (R6). Não decide contagem final — quem orquestra é o loop em generate().
  private async runRound(input: {
    config: GenerationConfig;
    material: string;
    requestCount: number;
    avoidStatements: string[];
    fillMode: boolean;
    nonce: string;
  }): Promise<{
    questions: GeneratedQuestion[];
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  }> {
    const spec = getStyleSpec(input.config.style);
    const systemPrompt = buildSystemPrompt(input.config.style);
    const userPrompt = buildUserPrompt({
      config: { ...input.config, questionCount: input.requestCount },
      material: input.material,
      avoidStatements:
        input.avoidStatements.length > 0 ? input.avoidStatements : undefined,
      fillMode: input.fillMode,
      nonce: input.nonce,
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
        // Temperatura por estilo (R1): baixa em simple/analytical pra
        // priorizar correção; mais alta em contextual/reflective. No fill
        // mode sobe um pouco pra forçar variação e destravar a contagem.
        temperature: input.fillMode
          ? Math.min(spec.temperature + 0.2, 1)
          : spec.temperature,
        max_tokens: maxOutputTokens(input.requestCount),
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

      // R6 — shape por questão. O strict schema permite options 2..6 e não
      // sabe o optionCount do estilo nem o formato fixo de V/F. Validamos
      // (e normalizamos V/F) aqui pra não vazar prova torta pro editor/OMR.
      const expectedOptionCount = spec.optionCount;
      for (const q of validated.questions) {
        if (q.type === "trueFalse") {
          if (
            q.options.length !== 2 ||
            normalizeKey(q.options[0] ?? "") !== "verdadeiro" ||
            normalizeKey(q.options[1] ?? "") !== "falso"
          ) {
            throw new AiGenerationFailedError(
              "Questão verdadeiro/falso veio com opções fora do formato esperado.",
            );
          }
          // Canoniza grafia/acentuação — downstream (OMR/correção) espera
          // exatamente estes literais.
          q.options = ["Verdadeiro", "Falso"];
        } else if (q.options.length !== expectedOptionCount) {
          throw new AiGenerationFailedError(
            `Questão de múltipla escolha veio com ${q.options.length} opções (esperado ${expectedOptionCount}).`,
          );
        }

        // Sanity check: correctAnswer dentro do range das options. Não cabe
        // em JSON Schema strict, então validamos aqui.
        if (q.correctAnswer >= q.options.length) {
          throw new AiGenerationFailedError(
            "Questão gerada com correctAnswer fora do range.",
          );
        }

        // Normaliza math (\( \), \[ \], ambiente nu → $ / $$) pra guardar
        // consistente. V/F mantém os literais canônicos (sem math).
        q.statement = normalizeMathDelimiters(q.statement);
        if (q.context !== null) {
          q.context = normalizeMathDelimiters(q.context);
        }
        q.explanation = normalizeMathDelimiters(q.explanation);
        if (q.type !== "trueFalse") {
          q.options = q.options.map((o) => normalizeMathDelimiters(o));
        }
      }

      return {
        questions: validated.questions,
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
        cachedInputTokens:
          completion.usage?.prompt_tokens_details?.cached_tokens ?? 0,
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
