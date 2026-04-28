import type { OrgBillingMode } from "@/domains/billing/domain/billing-mode.js";
import type { OrganizationBillingSettingsRepository } from "@/domains/billing/domain/organization-billing-settings-repository.js";
import { OrganizationBillingSettings } from "@/domains/billing/domain/organization-billing-settings.js";
import type { KintalInstitutionsRepository } from "./ports/kintal-institutions-repository.js";
import { InstitutionNotFoundError } from "../domain/institutions-errors.js";

interface Input {
  organizationId: string;
  billingMode: OrgBillingMode;
}

/**
 * Alterna o modo de cobrança da org. Cria settings se a org foi
 * provisionada antes da feature de billing (defensivo).
 */
export class UpdateInstitutionBillingUseCase {
  constructor(
    private readonly institutions: KintalInstitutionsRepository,
    private readonly settings: OrganizationBillingSettingsRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const exists = await this.institutions.exists(input.organizationId);
    if (!exists) throw new InstitutionNotFoundError();

    const current = await this.settings.findByOrg(input.organizationId);
    if (current) {
      current.changeBillingMode(input.billingMode);
      await this.settings.save(current);
      return;
    }
    const fresh = OrganizationBillingSettings.createDefault(
      input.organizationId,
    );
    fresh.changeBillingMode(input.billingMode);
    await this.settings.save(fresh);
  }
}
