import type { EnsureSufficientBalanceUseCase } from "./ensure-sufficient-balance.js";
import type {
  DebitCreditsUseCase,
  DebitResult,
} from "./debit-credits.js";
import type { LedgerReason } from "../domain/ledger-entry.js";
import type { BillingTargetResolver } from "./billing-target-resolver.js";
import {
  InstitutionOutOfCreditsError,
  InsufficientCreditsError,
} from "../domain/billing-errors.js";

/**
 * Fachada que o domínio ai-ops consome. Mantém ai-ops desacoplado dos
 * detalhes de wallets/ledger + roteamento user-vs-org.
 *
 * Callers passam `userId` e `activeOrganizationId` (ambos vêm da sessão BA
 * via `req.auth`). A BillingService resolve de qual carteira tira — depende
 * do modo de cobrança da org (pool: da org; per_teacher: do user;
 * pay_per_use: da org). Quando estoura a carteira da org, o erro é
 * re-mapeado pra `InstitutionOutOfCreditsError` pra o frontend mostrar
 * mensagem específica.
 */
export interface BillingService {
  ensureSufficientBalance(input: {
    userId: string;
    activeOrganizationId: string | null;
    estimate: number;
  }): Promise<void>;
  debit(input: {
    userId: string;
    activeOrganizationId: string | null;
    amount: number;
    reason: LedgerReason;
    relatedAction: string;
    tokensUsed?: number;
    metadata?: Record<string, unknown>;
  }): Promise<DebitResult>;
}

export class DefaultBillingService implements BillingService {
  constructor(
    private readonly ensure: EnsureSufficientBalanceUseCase,
    private readonly debitUc: DebitCreditsUseCase,
    private readonly resolver: BillingTargetResolver,
  ) {}

  async ensureSufficientBalance(input: {
    userId: string;
    activeOrganizationId: string | null;
    estimate: number;
  }): Promise<void> {
    const target = await this.resolver.resolve({
      userId: input.userId,
      activeOrganizationId: input.activeOrganizationId,
    });
    try {
      await this.ensure.execute({
        ownerId: target.id,
        scope: target.scope,
        estimate: input.estimate,
      });
    } catch (err) {
      if (err instanceof InsufficientCreditsError && target.scope === "org") {
        throw new InstitutionOutOfCreditsError(err.required, err.available);
      }
      throw err;
    }
  }

  async debit(input: {
    userId: string;
    activeOrganizationId: string | null;
    amount: number;
    reason: LedgerReason;
    relatedAction: string;
    tokensUsed?: number;
    metadata?: Record<string, unknown>;
  }): Promise<DebitResult> {
    const target = await this.resolver.resolve({
      userId: input.userId,
      activeOrganizationId: input.activeOrganizationId,
    });
    try {
      return await this.debitUc.execute({
        ownerId: target.id,
        scope: target.scope,
        // Em scope=org, o userId humano fica no actorUserId pra preservar
        // "quem consumiu" no ledger institucional.
        // Em scope=user, o use case faz fallback automático pra ownerId.
        actorUserId: target.scope === "org" ? input.userId : null,
        amount: input.amount,
        reason: input.reason,
        relatedAction: input.relatedAction,
        tokensUsed: input.tokensUsed ?? null,
        metadata: input.metadata,
      });
    } catch (err) {
      if (err instanceof InsufficientCreditsError && target.scope === "org") {
        throw new InstitutionOutOfCreditsError(err.required, err.available);
      }
      throw err;
    }
  }
}
