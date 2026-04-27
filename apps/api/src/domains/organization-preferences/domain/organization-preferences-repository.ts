import type { OrganizationPreferences } from "./organization-preferences.js";

export interface OrganizationPreferencesRepository {
  /**
   * Retorna preferências persistidas. Quando a org nunca configurou
   * nada, devolve `null` — o use case decide se materializa defaults.
   */
  findByOrg(organizationId: string): Promise<OrganizationPreferences | null>;

  /** Upsert. Idempotente. */
  save(prefs: OrganizationPreferences): Promise<void>;
}
