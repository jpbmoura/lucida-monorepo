import type { SubmissionRepository } from "../domain/submission-repository.js";

interface Input {
  ownerId: string;
}

export interface PendingCorrectionsOutput {
  count: number;
}

/**
 * Conta quantas submissões do professor têm discursivas aguardando correção.
 * Alimenta o resumo "Lulu sugere" no dashboard.
 */
export class CountPendingCorrectionsUseCase {
  constructor(private readonly submissions: SubmissionRepository) {}

  async execute(input: Input): Promise<PendingCorrectionsOutput> {
    const count = await this.submissions.countPendingGradingByOwner(
      input.ownerId,
    );
    return { count };
  }
}
