// Fórmula central de crédito. Único lugar onde o cálculo mora — quando
// o sistema de billing for definido, mexer só neste arquivo.
//
// Regra atual: 1 crédito a cada 5,5 tokens (input + output), arredondando
// pra cima. Mínimo de 1 crédito. Calibrado pra que prova contextual de 10
// questões custe ~700 créditos, alinhando os planos: Básico (5.000) = ~7
// provas/mês, Pro (15.000) = ~21 provas/mês.

import type { GenerationConfig } from "../domain/generation-types.js";
import { buildSystemPrompt, buildUserPrompt } from "./openai/prompts/index.js";
import { QUESTION_BATCH_SIZE } from "./openai/generation-tuning.js";

const TOKENS_PER_CREDIT = 5.5;
const MIN_CREDITS = 1;
/** Heurística pt-BR no GPT-4 family — ~3.6 chars por token. */
const CHARS_PER_TOKEN = 3.6;
/**
 * Token de input cacheado custa ~50% do normal na OpenAI (prompt caching).
 * A geração em lotes reenvia o mesmo prefixo (system + material) em cada
 * lote; do 2º em diante ele vem cacheado. Cobramos o cacheado nesse fator.
 */
const CACHED_INPUT_DISCOUNT = 0.5;
/**
 * Saída média por questão. Estilo contextual é mais verboso (parágrafo de
 * contexto + explicação detalhada), os outros ficam mais enxutos.
 */
const OUTPUT_TOKENS_PER_QUESTION: Record<GenerationConfig["style"], number> = {
  simple: 140,
  contextual: 240,
  analytical: 200,
  reflective: 220,
};

export function estimateCredits(input: {
  inputTokens: number;
  outputTokens: number;
  /** Parcela de `inputTokens` que veio do cache (cobrada com desconto). */
  cachedInputTokens?: number;
}): number {
  const cached = Math.min(input.cachedInputTokens ?? 0, input.inputTokens ?? 0);
  const uncachedInput = (input.inputTokens ?? 0) - cached;
  const billable =
    uncachedInput + cached * CACHED_INPUT_DISCOUNT + (input.outputTokens ?? 0);
  return Math.max(MIN_CREDITS, Math.ceil(billable / TOKENS_PER_CREDIT));
}

/**
 * Estimativa pré-geração. Constrói os mesmos prompts (system + user) que
 * o generator vai mandar pra OpenAI e mede o tamanho real, em vez de só
 * o material. Isso é importante porque o system prompt da Lucida (persona,
 * golden rules, estilo, output contract) é grande e fixo — ignorá-lo deixa
 * a estimativa subdimensionada quando o material é pequeno.
 *
 * A geração roda em lotes (QUESTION_BATCH_SIZE por chamada) e reenvia o
 * prefixo (system + material) em cada lote. Modelamos isso: 1ª chamada com
 * input cheio + as demais com o material cacheado (cobrado com desconto).
 * Sem isso a estimativa subdimensiona e o pré-check de saldo libera uma
 * geração que estoura no meio.
 */
export function estimateCreditsBeforeGeneration(input: {
  config: GenerationConfig;
  /** Material já extraído (joined text dos sources). */
  material: string;
  /** Para regenerate: enunciados das questões existentes pra "evitar". */
  avoidStatements?: string[];
}): number {
  const batchCount = Math.max(
    1,
    Math.ceil(input.config.questionCount / QUESTION_BATCH_SIZE),
  );

  const systemPrompt = buildSystemPrompt(input.config.style);
  const userPrompt = buildUserPrompt({
    config: {
      ...input.config,
      questionCount: Math.min(QUESTION_BATCH_SIZE, input.config.questionCount),
    },
    material: input.material,
    avoidStatements: input.avoidStatements,
  });

  const perCallInputTokens = Math.ceil(
    (systemPrompt.length + userPrompt.length) / CHARS_PER_TOKEN,
  );
  // Conservador: tratamos só o material como cacheável nos lotes 2+ (o
  // system também é, mas subestimar o desconto deixa a reserva por cima).
  const materialTokens = Math.ceil(input.material.length / CHARS_PER_TOKEN);

  const totalInputTokens = perCallInputTokens * batchCount;
  const cachedInputTokens = materialTokens * (batchCount - 1);

  const outputTokens =
    input.config.questionCount *
    OUTPUT_TOKENS_PER_QUESTION[input.config.style];

  return estimateCredits({
    inputTokens: totalInputTokens,
    outputTokens,
    cachedInputTokens,
  });
}
