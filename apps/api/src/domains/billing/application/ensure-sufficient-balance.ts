import type { WalletRepository } from "../domain/wallet-repository.js";
import type { BillingScope } from "../domain/billing-scope.js";
import { InsufficientCreditsError } from "../domain/billing-errors.js";

/**
 * Margem sobre a estimativa antes da ação. No modelo de preço tabelado a
 * cobrança é EXATA (vem de `priceExam`/`priceRegenerate`), então não há
 * estouro a cobrir: o gate exige exatamente o preço. Manter margem > 1
 * bloquearia quem tem o valor exato.
 */
const SAFETY_MARGIN = 1.0;

interface Input {
  ownerId: string;
  /** Scope default "user" mantém callers antigos funcionando. */
  scope?: BillingScope;
  estimate: number;
}

/**
 * Valida que o "alvo de cobrança" tem saldo pra começar uma ação de IA.
 * Aplica SAFETY_MARGIN sobre a estimativa — bloqueia com 402
 * (InsufficientCreditsError) se insuficiente. Quem chama decide scope
 * (tipicamente via `BillingTargetResolver`); o erro institucional é
 * re-mapeado na camada da `BillingService`.
 */
export class EnsureSufficientBalanceUseCase {
  constructor(private readonly wallets: WalletRepository) {}

  async execute(input: Input): Promise<void> {
    const required = Math.ceil(input.estimate * SAFETY_MARGIN);
    const active = await this.wallets.findActiveByOwner(
      input.ownerId,
      input.scope ?? "user",
    );
    const available = active.reduce((sum, w) => sum + w.balance, 0);
    if (available < required) {
      throw new InsufficientCreditsError(required, available);
    }
  }
}
