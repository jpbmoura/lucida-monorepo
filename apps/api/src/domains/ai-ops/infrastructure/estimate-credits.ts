// Custo real da chamada OpenAI em "créditos", a partir dos tokens de fato
// consumidos. NÃO é o valor cobrado do professor — a cobrança é tabelada
// (ver domain/exam-pricing.ts). Isto alimenta só telemetria: o gerador
// grava o resultado em `usage`, e o ledger guarda `tokensUsed` pra análise
// de eficiência/custo. Mantém a régua histórica de 1 crédito a cada 5,5 tokens.

const TOKENS_PER_CREDIT = 5.5;
const MIN_CREDITS = 1;
/**
 * Token de input cacheado custa ~50% do normal na OpenAI (prompt caching).
 * Quando um top-up reenvia o mesmo prefixo (system + material), ele vem
 * cacheado; refletimos isso no custo estimado.
 */
const CACHED_INPUT_DISCOUNT = 0.5;

export function estimateCredits(input: {
  inputTokens: number;
  outputTokens: number;
  /** Parcela de `inputTokens` que veio do cache (contada com desconto). */
  cachedInputTokens?: number;
}): number {
  const cached = Math.min(input.cachedInputTokens ?? 0, input.inputTokens ?? 0);
  const uncachedInput = (input.inputTokens ?? 0) - cached;
  const billable =
    uncachedInput + cached * CACHED_INPUT_DISCOUNT + (input.outputTokens ?? 0);
  return Math.max(MIN_CREDITS, Math.ceil(billable / TOKENS_PER_CREDIT));
}
