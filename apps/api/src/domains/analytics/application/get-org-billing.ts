import type { WalletRepository } from "@/domains/billing/domain/wallet-repository.js";
import type { LedgerRepository } from "@/domains/billing/domain/ledger-repository.js";
import type { OrganizationBillingSettingsRepository } from "@/domains/billing/domain/organization-billing-settings-repository.js";
import type { OrgBillingMode } from "@/domains/billing/domain/billing-mode.js";
import type { OrganizationMembersRepository } from "./ports/organization-members-repository.js";

interface Input {
  organizationId: string;
  /** Quantos entries do ledger retornar (mais recentes primeiro). */
  ledgerLimit?: number;
}

export interface OrgBillingResponse {
  settings: {
    billingMode: OrgBillingMode;
  };
  balance: {
    total: number;
    /** Breakdown por fonte — em pool hoje só `admin_grant`. */
    wallets: Array<{
      source: string;
      balance: number;
      expiresAt: string | null;
    }>;
  };
  ledger: {
    items: Array<{
      id: string;
      type: "credit" | "debit";
      amount: number;
      reason: string;
      relatedAction: string | null;
      /** Nome do ator humano (quando tiver). Null em créditos admin etc. */
      actorUserId: string | null;
      actorName: string | null;
      createdAt: string;
    }>;
  };
}

/**
 * Alimenta a visão de cobrança institucional: saldo atual + wallets ativas +
 * ledger recente. Resolve nomes dos actors (professores) com uma query só
 * de members, pra evitar fan-out. Se settings da org não existir (caso raro,
 * só ocorre se a migration não rodou), devolve defaults `pool`.
 */
export class GetOrgBillingUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly ledger: LedgerRepository,
    private readonly settingsRepo: OrganizationBillingSettingsRepository,
    private readonly members: OrganizationMembersRepository,
  ) {}

  async execute(input: Input): Promise<OrgBillingResponse> {
    const limit = input.ledgerLimit ?? 10;
    const [settings, orgWallets, ledgerEntries, memberList] = await Promise.all([
      this.settingsRepo.findByOrg(input.organizationId),
      this.wallets.findActiveByOwner(input.organizationId, "org"),
      this.ledger.findByOwner({
        ownerId: input.organizationId,
        scope: "org",
        limit,
      }),
      this.members.listMembers(input.organizationId),
    ]);

    const actorNameByUserId = new Map(
      memberList.map((m) => [m.userId, m.name]),
    );

    const total = orgWallets.reduce((sum, w) => sum + w.balance, 0);

    return {
      settings: {
        billingMode: settings?.billingMode ?? "pool",
      },
      balance: {
        total,
        wallets: orgWallets.map((w) => ({
          source: w.source,
          balance: w.balance,
          expiresAt: w.expiresAt?.toISOString() ?? null,
        })),
      },
      ledger: {
        items: ledgerEntries.map((e) => ({
          id: e.id.toString(),
          type: e.type,
          amount: e.amount,
          reason: e.reason,
          relatedAction: e.relatedAction,
          actorUserId: e.actorUserId,
          actorName: e.actorUserId
            ? (actorNameByUserId.get(e.actorUserId) ?? null)
            : null,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    };
  }
}
