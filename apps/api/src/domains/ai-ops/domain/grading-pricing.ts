// Preço da CORREÇÃO de discursivas por IA — valor FIXO por questão corrigida.
//
// Tabelado e determinístico (igual à geração de provas): o custo é uma função
// pura da QUANTIDADE de respostas corrigidas, independente do tamanho da
// resposta ou da rubrica. Como a mesma quantidade gera o mesmo preço na
// cotação, no pré-check e no débito, o valor cobrado é EXATAMENTE o estimado.
//
// Respostas em branco NÃO pagam — não há chamada de IA (nível 0 direto).
// Cobrança por questão efetivamente corrigida.
//
// Único lugar onde o preço da correção mora — qualquer recalibração mexe só aqui.

/** Custo fixo, em créditos, por questão discursiva corrigida pela IA. */
export const CREDITS_PER_GRADED_ANSWER = 30;

/** Preço de corrigir UMA resposta (não-branca). */
export function priceGradeAnswer(): number {
  return CREDITS_PER_GRADED_ANSWER;
}

/** Preço de corrigir um lote de N respostas (não-brancas). */
export function priceGradeBatch(answerCount: number): number {
  return CREDITS_PER_GRADED_ANSWER * Math.max(0, answerCount);
}
