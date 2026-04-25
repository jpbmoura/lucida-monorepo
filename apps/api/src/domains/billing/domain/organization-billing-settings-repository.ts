import type { OrganizationBillingSettings } from "./organization-billing-settings.js";

export interface OrganizationBillingSettingsRepository {
  /** Retorna as configurações da org. `null` quando nunca foi provisionada. */
  findByOrg(organizationId: string): Promise<OrganizationBillingSettings | null>;
  /** Upsert por organizationId — uma entry por org. */
  save(settings: OrganizationBillingSettings): Promise<void>;
}
