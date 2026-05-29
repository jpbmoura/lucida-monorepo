import type { LessonPlanGenerationConfig } from "../domain/lesson-plan-generation-types.js";
import { priceLessonPlan } from "../domain/lesson-plan-pricing.js";

interface Input {
  config: Pick<LessonPlanGenerationConfig, "segment">;
}

export interface EstimateLessonPlanResult {
  estimatedCredits: number;
}

/**
 * Cota o custo exato da geração do plano. No modelo tabelado o preço depende
 * só do segmento — cotação instantânea, sem extrair material nem chamar OpenAI.
 * O número devolvido é exatamente o que será cobrado em generate-lesson-plan.
 */
export class EstimateLessonPlanUseCase {
  async execute(input: Input): Promise<EstimateLessonPlanResult> {
    return { estimatedCredits: priceLessonPlan(input.config) };
  }
}
