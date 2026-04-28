import type { BillingScope } from "../domain/billing-scope.js";
import type { OrganizationBillingSettingsRepository } from "../domain/organization-billing-settings-repository.js";

export interface BillingTarget {
  scope: BillingScope;
  /** userId pra scope=user, orgId pra scope=org. */
  id: string;
}

export interface BillingTargetResolver {
  /**
   * Decide de qual carteira a próxima operação (check/debit) deve sair.
   *
   * Regras:
   *   - Sem `activeOrganizationId`: sempre user (professor avulso).
   *   - Com org em modo `pool`: org (pooled estrito — wallet pessoal fica
   *     congelada).
   *   - Com org em modo `per_teacher`: user (wallet pessoal é "seeded"
   *     institucionalmente; fica pra Fase 3c implementar o seed real).
   *   - Com org em modo `pay_per_use`: org (o consumo acumula no ledger
   *     da org pra fatura; fica pra Fase 3d).
   *   - Org sem settings salvas: fallback pra user — segura um cenário
   *     inesperado sem quebrar o caller.
   */
  resolve(input: {
    userId: string;
    activeOrganizationId: string | null;
  }): Promise<BillingTarget>;
}

export class DefaultBillingTargetResolver implements BillingTargetResolver {
  constructor(
    private readonly orgSettings: OrganizationBillingSettingsRepository,
  ) {}

  async resolve(input: {
    userId: string;
    activeOrganizationId: string | null;
  }): Promise<BillingTarget> {
    if (!input.activeOrganizationId) {
      return { scope: "user", id: input.userId };
    }
    const settings = await this.orgSettings.findByOrg(
      input.activeOrganizationId,
    );
    if (!settings) {
      // Org sem settings — trata como user pra não bloquear ação.
      return { scope: "user", id: input.userId };
    }
    if (settings.billingMode === "pool") {
      return { scope: "org", id: input.activeOrganizationId };
    }
    if (settings.billingMode === "pay_per_use") {
      return { scope: "org", id: input.activeOrganizationId };
    }
    if (settings.billingMode === "unlimited") {
      // Modo cortesia: scope=org pra que o ledger registre o consumo
      // institucional; o BillingService curto-circuita ensure/debit antes
      // de tocar em wallet, evitando o erro de "sem saldo".
      return { scope: "org", id: input.activeOrganizationId };
    }
    // per_teacher usa wallet pessoal do user (seeded pela org no futuro).
    return { scope: "user", id: input.userId };
  }
}
