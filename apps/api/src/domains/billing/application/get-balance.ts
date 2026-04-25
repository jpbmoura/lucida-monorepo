import type { WalletRepository } from "../domain/wallet-repository.js";
import type { CreditSource } from "../domain/credit-source.js";

interface Input {
  ownerId: string;
}

export interface BalanceBreakdown {
  source: CreditSource;
  balance: number;
  expiresAt: string | null;
}

export interface BalanceDTO {
  /** Soma de todas as carteiras ativas não expiradas. */
  total: number;
  /** Quebra por source (ordem de consumo: gasta primeiro primeiro). */
  breakdown: BalanceBreakdown[];
}

/**
 * Retorna o saldo consolidado do usuário + quebra por carteira.
 * Carteiras com balance=0 ou expiradas são omitidas.
 */
export class GetBalanceUseCase {
  constructor(private readonly wallets: WalletRepository) {}

  async execute(input: Input): Promise<BalanceDTO> {
    const active = await this.wallets.findActiveByOwner(input.ownerId);
    const breakdown = active.map((w) => ({
      source: w.source,
      balance: w.balance,
      expiresAt: w.expiresAt?.toISOString() ?? null,
    }));
    const total = active.reduce((sum, w) => sum + w.balance, 0);
    return { total, breakdown };
  }
}
