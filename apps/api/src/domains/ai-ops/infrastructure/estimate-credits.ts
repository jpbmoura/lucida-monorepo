// Fórmula placeholder de crédito. Projetada pra ser o ÚNICO lugar onde o cálculo
// mora — quando o sistema de billing for definido, mexer só neste arquivo.
//
// Regra atual: 1 crédito a cada 100 tokens (input + output), arredondando pra cima.
// Input conta um pouco menos que output (output é o que gera custo real maior),
// mas a fórmula 1:1 + mínimo de 1 mantém o número visível pro usuário em uma

const TOKENS_PER_CREDIT = 100;
const MIN_CREDITS = 1;

export function estimateCredits(input: {
  inputTokens: number;
  outputTokens: number;
}): number {
  const total = (input.inputTokens ?? 0) + (input.outputTokens ?? 0);
  return Math.max(MIN_CREDITS, Math.ceil(total / TOKENS_PER_CREDIT));
}

// Estimativa ANTES da geração — usa heurística de 4 chars ≈ 1 token e
// uma margem pra resposta da IA.
export function estimateCreditsBeforeGeneration(input: {
  material: string;
  expectedQuestionCount: number;
}): number {
  const inputTokens = Math.ceil(input.material.length / 4);
  // Cada questão gerada custa ~150 tokens de saída em média (enunciado + opções + explicação).
  const outputTokens = input.expectedQuestionCount * 150;
  return estimateCredits({ inputTokens, outputTokens });
}
