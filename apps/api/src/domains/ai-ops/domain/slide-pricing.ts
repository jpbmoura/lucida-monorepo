// Tabela de preço da geração de SLIDES. Mesmo modelo tabelado das provas e
// planos (ver exam-pricing.ts / lesson-plan-pricing.ts): preço é função pura e
// determinística da config (fonte + nº de slides), independente de tokens ou
// tamanho do material. A mesma config gera o mesmo preço na cotação, no
// pré-check e no débito.
//
// IMPORTANTE — valores PROVISÓRIOS (brief seção 8). Calibrar depois de medir o
// consumo real de tokens. Alvos iniciais: ~400 créditos/deck e ~50/slide
// regenerado, mais barato a partir de um plano de aula do que de material cru.
// Quando recalibrar, mexa só aqui. `tokensUsed` já é gravado no ledger
// (telemetria) pra embasar a calibração.

import type {
  SlideDeckGenerationConfig,
  SlideSourceType,
} from "./slide-generation-types.js";

// Custo base por fonte — material cru exige extração + leitura mais cara que um
// plano de aula já estruturado.
const BASE_BY_SOURCE: Record<SlideSourceType, number> = {
  "lesson-plan": 100,
  material: 150,
};

/** Custo por slide gerado. */
const PER_SLIDE = 25;

/** Custo de regerar um único slide — sem a base (prompt reaproveitado/cacheado). */
const REGENERATE_SLIDE_CREDITS = 50;

/** Preço exato de uma geração de deck. */
export function priceDeck(
  config: Pick<SlideDeckGenerationConfig, "source" | "slideCount">,
): number {
  return BASE_BY_SOURCE[config.source] + PER_SLIDE * config.slideCount;
}

/** Preço exato de regerar um slide. */
export function priceRegenerateSlide(): number {
  return REGENERATE_SLIDE_CREDITS;
}
