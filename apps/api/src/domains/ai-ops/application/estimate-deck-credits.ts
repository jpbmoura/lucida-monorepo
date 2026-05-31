import type { SlideDeckGenerationConfig } from "../domain/slide-generation-types.js";
import { priceDeck } from "../domain/slide-pricing.js";

interface Input {
  config: Pick<SlideDeckGenerationConfig, "source" | "slideCount">;
}

export interface EstimateDeckCreditsResult {
  estimatedCredits: number;
}

/**
 * Cota o custo exato da geração do deck. No modelo tabelado o preço depende só
 * da fonte e do nº de slides — cotação instantânea, sem extrair material nem
 * chamar OpenAI. O número devolvido é exatamente o que será cobrado em
 * generate-deck.
 */
export class EstimateDeckCreditsUseCase {
  async execute(input: Input): Promise<EstimateDeckCreditsResult> {
    return { estimatedCredits: priceDeck(input.config) };
  }
}
