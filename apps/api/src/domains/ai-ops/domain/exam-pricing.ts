// Tabela de preço da geração por IA. Modelo tabelado: o custo é uma função
// pura e determinística da config (estilo + nº de questões), independente de
// tokens ou tamanho do material. Como a mesma config gera o mesmo preço na
// cotação, no pré-check e no débito, o valor cobrado é EXATAMENTE o informado.
//
// Único lugar onde o preço mora — qualquer recalibração mexe só aqui.
//
// Calibração: mantém prova contextual de 10 questões = 700 créditos, alinhando
// os planos (Básico 5.000 ≈ 7 provas/mês, Pro 15.000 ≈ 21). A base cobre o
// custo fixo do prompt (persona + golden rules + material) e funciona como
// piso natural pra provas curtas.

import type { ExamStyle, GenerationConfig } from "./generation-types.js";

/** Custo fixo por geração — independe do nº de questões. */
const BASE_CREDITS = 250;

/** Custo por questão, por estilo. Contextual é o mais verboso. */
const PER_QUESTION: Record<ExamStyle, number> = {
  simple: 25,
  analytical: 42,
  reflective: 45,
  contextual: 45,
};

/** Preço exato de uma geração de prova. */
export function priceExam(config: Pick<GenerationConfig, "style" | "questionCount">): number {
  return BASE_CREDITS + PER_QUESTION[config.style] * config.questionCount;
}

/**
 * Preço exato de regerar uma única questão. Sem a base: o prompt (system +
 * material) já foi enviado na geração original e vem cacheado, então cobramos
 * só o custo marginal de 1 questão.
 */
export function priceRegenerate(config: Pick<GenerationConfig, "style">): number {
  return PER_QUESTION[config.style];
}

/**
 * Custo por questão discursiva gerada. Mais caro que objetiva: a saída carrega
 * enunciado + resposta-modelo + rubrica inteira (critérios × níveis), bem mais
 * verbosa. Independe do estilo das objetivas.
 */
const PER_OPEN_QUESTION = 60;

/** Preço exato de gerar uma prova de N questões discursivas + rubrica. */
export function priceOpenExam(questionCount: number): number {
  return BASE_CREDITS + PER_OPEN_QUESTION * questionCount;
}

/** Preço de regerar 1 questão discursiva — só o custo marginal, sem base. */
export function priceRegenerateOpen(): number {
  return PER_OPEN_QUESTION;
}
