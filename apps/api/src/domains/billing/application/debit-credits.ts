import type { WalletRepository } from "../domain/wallet-repository.js";
import type { LedgerRepository } from "../domain/ledger-repository.js";
import { LedgerEntry, type LedgerReason } from "../domain/ledger-entry.js";
import type { BillingScope } from "../domain/billing-scope.js";
import {
  AtomicDebitService,
  StaleBalanceError,
  type DebitPlan,
} from "../infrastructure/atomic-debit-service.js";
import { InsufficientCreditsError } from "../domain/billing-errors.js";

const MAX_RETRIES = 5;

interface Input {
  ownerId: string;
  /** Scope default "user" mantém callers antigos funcionando. */
  scope?: BillingScope;
  /**
   * Ator humano (userId hex). Relevante em scope=org — preserva "quem
   * consumiu" no ledger institucional. Em scope=user geralmente igual ao
   * ownerId e pode ficar null pra operações sistêmicas (renewal, expiração).
   */
  actorUserId?: string | null;
  amount: number;
  reason: LedgerReason;
  relatedAction?: string | null;
  tokensUsed?: number | null;
  metadata?: Record<string, unknown>;
}

export interface DebitResult {
  amountDebited: number;
  /** Uma linha por carteira afetada (útil pra UI mostrar origem). */
  breakdown: Array<{
    walletId: string;
    source: string;
    taken: number;
  }>;
}

/**
 * Débito atômico com FIFO por prioridade de carteira.
 *
 * Fluxo:
 * 1. Lê carteiras ativas do owner (já ordenadas por prioridade + expiração).
 * 2. Planeja onde tirar cada crédito (varre até somar `amount`).
 * 3. Aplica tudo numa transação Mongo junto com as entradas do ledger.
 * 4. Se outro débito alterou saldos entre 1 e 3 (detectado pelo guard
 *    `balance >= take` no updateOne), retry — até MAX_RETRIES vezes.
 *
 * Não lança InsufficientCreditsError se já foi chamado pré-check. Mas
 * protege contra race condition no qual alguém debitou entre o pré-check
 * e o débito real.
 */
export class DebitCreditsUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly ledger: LedgerRepository,
    private readonly atomicDebit: AtomicDebitService,
  ) {}

  async execute(input: Input): Promise<DebitResult> {
    if (input.amount <= 0) {
      return { amountDebited: 0, breakdown: [] };
    }

    const scope: BillingScope = input.scope ?? "user";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const wallets = await this.wallets.findActiveByOwner(
        input.ownerId,
        scope,
      );
      const totalAvailable = wallets.reduce((s, w) => s + w.balance, 0);
      if (totalAvailable < input.amount) {
        throw new InsufficientCreditsError(input.amount, totalAvailable);
      }

      // Planeja o débito.
      let remaining = input.amount;
      const plan: DebitPlan[] = [];
      for (const w of wallets) {
        if (remaining === 0) break;
        if (w.balance === 0) continue;
        const take = Math.min(w.balance, remaining);
        plan.push({
          walletId: w.id.toString(),
          walletSource: w.source,
          take,
        });
        remaining -= take;
      }

      const ledgerEntries = plan.map((step) =>
        LedgerEntry.create({
          id: this.ledger.nextId(),
          scope,
          ownerId: input.ownerId,
          // Em scope=user, fallback pra ownerId (user é o próprio ator).
          // Em scope=org, callers devem passar explicitamente.
          actorUserId:
            input.actorUserId ?? (scope === "user" ? input.ownerId : null),
          walletId: asWalletId(step.walletId),
          walletSource: step.walletSource,
          type: "debit",
          amount: step.take,
          reason: input.reason,
          relatedAction: input.relatedAction ?? null,
          tokensUsed: input.tokensUsed ?? null,
          metadata: input.metadata ?? {},
        }),
      );

      try {
        await this.atomicDebit.apply({ plan, ledgerEntries });
        return {
          amountDebited: input.amount,
          breakdown: plan.map((s) => ({
            walletId: s.walletId,
            source: s.walletSource,
            taken: s.take,
          })),
        };
      } catch (err) {
        if (err instanceof StaleBalanceError) {
          // Outro débito passou na frente — retry com saldo atualizado.
          continue;
        }
        throw err;
      }
    }

    throw new Error(
      `Débito falhou após ${MAX_RETRIES} tentativas — contenção alta de saldo.`,
    );
  }
}

// Import dentro do módulo pra evitar ciclo (WalletId vive no domain).
import { WalletId } from "../domain/wallet-id.js";
function asWalletId(raw: string) {
  return WalletId.of(raw);
}
