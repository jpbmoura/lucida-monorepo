// Tabela de preço da geração de PLANOS DE AULA. Mesmo modelo tabelado das
// provas (ver exam-pricing.ts): preço é função pura e determinística da config
// (segmento), independente de tokens ou tamanho do material. A mesma config
// gera o mesmo preço na cotação, no pré-check e no débito.
//
// IMPORTANTE — valores PROVISÓRIOS. O brief (seção 8) define que a calibração
// real acontece depois de medir o consumo de tokens em testes, pra cobrar no
// mesmo estilo das provas. Até lá, estes números são um piso razoável. Quando
// recalibrar, mexa só aqui. `tokensUsed` já é gravado no ledger (telemetria)
// pra embasar a calibração.

import type { LessonPlanGenerationConfig } from "./lesson-plan-generation-types.js";

/** Custo base por segmento — Faculdade é o mais verboso (ementa, bibliografia). */
const BASE_BY_SEGMENT: Record<
  LessonPlanGenerationConfig["segment"],
  number
> = {
  FUNDAMENTAL: 300,
  MEDIO: 300,
  FACULDADE: 400,
  INFOPRODUTOR: 350,
};

/** Custo de regerar um único bloco — sem a base (prompt reaproveitado/cacheado). */
const REGENERATE_BLOCK_CREDITS = 60;

/** Preço exato de uma geração de plano de aula. */
export function priceLessonPlan(
  config: Pick<LessonPlanGenerationConfig, "segment">,
): number {
  return BASE_BY_SEGMENT[config.segment];
}

/** Preço exato de regerar um bloco do plano. */
export function priceRegenerateBlock(): number {
  return REGENERATE_BLOCK_CREDITS;
}
