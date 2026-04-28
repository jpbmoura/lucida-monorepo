import type { EnsureSufficientBalanceUseCase } from "./ensure-sufficient-balance.js";
import type {
  DebitCreditsUseCase,
  DebitResult,
} from "./debit-credits.js";
import { LedgerEntry, type LedgerReason } from "../domain/ledger-entry.js";
import type { LedgerRepository } from "../domain/ledger-repository.js";
import type { OrganizationBillingSettingsRepository } from "../domain/organization-billing-settings-repository.js";
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
    private readonly orgSettings: OrganizationBillingSettingsRepository,
    private readonly ledger: LedgerRepository,
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
    // Cortesia: sem checagem de saldo. Ledger é gravado só no debit.
    if (await this.isUnlimited(input.activeOrganizationId, target.scope)) {
      return;
    }
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

    // Cortesia: grava ledger entry pra auditoria, sem mexer em wallet.
    // walletId é simbólico (`unlimited:<orgId>`) — não aponta pra doc real
    // mas mantém auditoria coerente. WalletSource fica `admin_grant` por
    // analogia de fonte (acordo administrativo).
    if (await this.isUnlimited(input.activeOrganizationId, target.scope)) {
      const entry = LedgerEntry.create({
        id: this.ledger.nextId(),
        scope: target.scope,
        ownerId: target.id,
        actorUserId: input.userId,
        walletId: pseudoWalletId(target.id),
        walletSource: "admin_grant",
        type: "debit",
        amount: input.amount,
        reason: input.reason,
        relatedAction: input.relatedAction,
        tokensUsed: input.tokensUsed ?? null,
        metadata: { ...(input.metadata ?? {}), billingMode: "unlimited" },
      });
      await this.ledger.save(entry);
      return {
        amountDebited: input.amount,
        breakdown: [
          {
            walletId: entry.walletId.toString(),
            source: "admin_grant",
            taken: input.amount,
          },
        ],
      };
    }

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

  /**
   * Resolve em runtime se a org ativa está em modo unlimited. Retorna
   * `false` quando o target final é `user` — o modo unlimited só faz
   * sentido pra scope=org (é a org que teve cortesia atribuída).
   */
  private async isUnlimited(
    activeOrganizationId: string | null,
    targetScope: "user" | "org",
  ): Promise<boolean> {
    if (targetScope !== "org" || !activeOrganizationId) return false;
    const settings = await this.orgSettings.findByOrg(activeOrganizationId);
    return settings?.isUnlimited() ?? false;
  }
}

// Import e helper localizados pra não inflar o topo do arquivo.
import { WalletId } from "../domain/wallet-id.js";
function pseudoWalletId(orgId: string): WalletId {
  return WalletId.of(`unlimited:${orgId}`);
}
