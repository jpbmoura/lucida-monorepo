// Fórmula central de crédito. Único lugar onde o cálculo mora — quando
// o sistema de billing for definido, mexer só neste arquivo.
//
// Regra atual: 1 crédito a cada 5,5 tokens (input + output), arredondando
// pra cima. Mínimo de 1 crédito. Calibrado pra que prova contextual de 10
// questões custe ~700 créditos, alinhando os planos: Básico (5.000) = ~7
// provas/mês, Pro (15.000) = ~21 provas/mês.

import type { GenerationConfig } from "../domain/generation-types.js";
import { buildSystemPrompt, buildUserPrompt } from "./openai/prompts/index.js";

const TOKENS_PER_CREDIT = 5.5;
const MIN_CREDITS = 1;
/** Heurística pt-BR no GPT-4 family — ~3.6 chars por token. */
const CHARS_PER_TOKEN = 3.6;
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
}): number {
  const total = (input.inputTokens ?? 0) + (input.outputTokens ?? 0);
  return Math.max(MIN_CREDITS, Math.ceil(total / TOKENS_PER_CREDIT));
}

/**
 * Estimativa pré-geração. Constrói os mesmos prompts (system + user) que
 * o generator vai mandar pra OpenAI e mede o tamanho real, em vez de só
 * o material. Isso é importante porque o system prompt da Lucida (persona,
 * golden rules, estilo, output contract) é grande e fixo — ignorá-lo deixa
 * a estimativa subdimensionada quando o material é pequeno.
 */
export function estimateCreditsBeforeGeneration(input: {
  config: GenerationConfig;
  /** Material já extraído (joined text dos sources). */
  material: string;
  /** Para regenerate: enunciados das questões existentes pra "evitar". */
  avoidStatements?: string[];
}): number {
  const systemPrompt = buildSystemPrompt(input.config.style);
  const userPrompt = buildUserPrompt({
    config: input.config,
    material: input.material,
    avoidStatements: input.avoidStatements,
  });

  const inputChars = systemPrompt.length + userPrompt.length;
  const inputTokens = Math.ceil(inputChars / CHARS_PER_TOKEN);
  const outputTokens =
    input.config.questionCount *
    OUTPUT_TOKENS_PER_QUESTION[input.config.style];

  return estimateCredits({ inputTokens, outputTokens });
}
