import { priceOpenExam } from "../domain/exam-pricing.js";

interface Input {
  questionCount: number;
}

export interface EstimateResult {
  estimatedCredits: number;
}

/**
 * Cota o custo da geração de prova discursiva. Tabelado (base + por questão),
 * instantâneo, sem extrair material nem chamar OpenAI. Mesmo valor do débito.
 */
export class EstimateOpenGenerationUseCase {
  async execute(input: Input): Promise<EstimateResult> {
    return { estimatedCredits: priceOpenExam(input.questionCount) };
  }
}
