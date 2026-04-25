import type { LedgerRepository } from "../domain/ledger-repository.js";
import type { LedgerReason, LedgerType } from "../domain/ledger-entry.js";

interface Input {
  ownerId: string;
  limit?: number;
  before?: Date;
}

export interface LedgerItemDTO {
  id: string;
  walletSource: string;
  type: LedgerType;
  amount: number;
  reason: LedgerReason;
  relatedAction: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Extrato do usuário — paginação simples por cursor (createdAt).
 * UI chama com `before` = createdAt do último item pra carregar mais.
 */
export class ListLedgerUseCase {
  constructor(private readonly ledger: LedgerRepository) {}

  async execute(input: Input): Promise<LedgerItemDTO[]> {
    const limit = Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT);
    const entries = await this.ledger.findByOwner({
      ownerId: input.ownerId,
      limit,
      before: input.before,
    });
    return entries.map((e) => ({
      id: e.id.toString(),
      walletSource: e.walletSource,
      type: e.type,
      amount: e.amount,
      reason: e.reason,
      relatedAction: e.relatedAction,
      tokensUsed: e.tokensUsed,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
