// Preço da CORREÇÃO de discursivas por IA.
//
// Diferente da geração (tabelada por estilo×qtd), a correção é N chamadas — uma
// por resposta de aluno — e cada uma carrega rubrica + resposta-modelo + resposta
// do aluno no input. O custo varia com o TAMANHO da resposta, então estimamos
// contra o consumo real: como as respostas já estão no banco, dá pra prever o
// custo antes de rodar e cobrar exatamente o estimado (estimativa == débito).
//
// Mantém a régua histórica de 1 crédito a cada 5,5 tokens (estimate-credits.ts).

const TOKENS_PER_CREDIT = 5.5;
const CHARS_PER_TOKEN = 4;
/** Overhead fixo do prompt (persona + injection defense + instruções). */
const PROMPT_OVERHEAD_TOKENS = 350;
/** Saída por critério: nível + justificativa curta + feedback. */
const OUTPUT_TOKENS_PER_CRITERION = 70;
const MIN_CREDITS_PER_ANSWER = 1;

export interface GradeAnswerCost {
  criteriaCount: number;
  answerChars: number;
  rubricChars: number;
  referenceChars?: number;
}

/** Preço exato de corrigir UMA resposta (estimativa == débito). */
export function priceGradeAnswer(input: GradeAnswerCost): number {
  const inputTokens =
    PROMPT_OVERHEAD_TOKENS +
    Math.ceil(
      (input.rubricChars + input.answerChars + (input.referenceChars ?? 0)) /
        CHARS_PER_TOKEN,
    );
  const outputTokens =
    OUTPUT_TOKENS_PER_CRITERION * Math.max(1, input.criteriaCount);
  return Math.max(
    MIN_CREDITS_PER_ANSWER,
    Math.ceil((inputTokens + outputTokens) / TOKENS_PER_CREDIT),
  );
}

/** Preço total de corrigir um lote de respostas. */
export function priceGradeBatch(answers: GradeAnswerCost[]): number {
  return answers.reduce((sum, a) => sum + priceGradeAnswer(a), 0);
}
