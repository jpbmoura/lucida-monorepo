import type { GenerationConfig } from "../domain/generation-types.js";
import { priceExam } from "../domain/exam-pricing.js";

interface Input {
  config: Pick<GenerationConfig, "style" | "questionCount">;
}

export interface EstimateResult {
  /** Créditos exatos — mesma função usada no débito pós-geração. */
  estimatedCredits: number;
}

/**
 * Cota o custo exato da geração a partir da config. No modelo tabelado o preço
 * não depende do material, então a cotação é instantânea: não extrai arquivo,
 * não chama OpenAI, não debita. O número devolvido aqui é exatamente o que
 * será cobrado em `generate-exam-questions`.
 */
export class EstimateExamGenerationUseCase {
  async execute(input: Input): Promise<EstimateResult> {
    return { estimatedCredits: priceExam(input.config) };
  }
}
