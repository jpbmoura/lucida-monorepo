import type { OrganizationPreferencesRepository } from "../domain/organization-preferences-repository.js";
import { OrganizationPreferences } from "../domain/organization-preferences.js";

interface Input {
  organizationId: string;
}

/**
 * Resolve preferências da org. Se nenhuma foi gravada ainda, devolve os
 * defaults (não persiste — escrita só acontece quando o admin altera).
 * Uso: rotas internas precisam saber o `matriculaScope` antes de validar
 * uma matrícula.
 */
export class GetOrganizationPreferencesUseCase {
  constructor(private readonly repo: OrganizationPreferencesRepository) {}

  async execute(input: Input): Promise<OrganizationPreferences> {
    const existing = await this.repo.findByOrg(input.organizationId);
    return existing ?? OrganizationPreferences.defaultsFor(input.organizationId);
  }
}
