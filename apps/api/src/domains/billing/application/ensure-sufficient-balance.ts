import type { WalletRepository } from "../domain/wallet-repository.js";
import type { BillingScope } from "../domain/billing-scope.js";
import { InsufficientCreditsError } from "../domain/billing-errors.js";

/**
 * Margem de segurança aplicada sobre a estimativa antes da geração. O modelo
 * pode devolver mais tokens que o esperado — queremos que o user tenha saldo
 * que cubra mesmo se a geração "estourar". 1.2 = 20% de folga.
 *
 * Se o débito real ultrapassar a margem, ele ainda acontece (não vamos
 * cobrar nada a mais que o real). A margem só serve pra decidir se deixa
 * começar a ação.
 */
const SAFETY_MARGIN = 1.2;

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
