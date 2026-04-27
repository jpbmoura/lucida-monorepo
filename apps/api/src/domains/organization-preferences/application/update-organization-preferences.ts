import type { OrganizationPreferencesRepository } from "../domain/organization-preferences-repository.js";
import { OrganizationPreferences } from "../domain/organization-preferences.js";
import type { MatriculaScope } from "../domain/matricula-scope.js";

interface Input {
  organizationId: string;
  matriculaScope?: MatriculaScope;
}

/**
 * Atualiza preferências. Patch — campos não presentes ficam intactos.
 * Materializa o doc se ainda não existir (com defaults) antes de aplicar
 * as mudanças.
 *
 * Nota: mudar `matriculaScope` no meio do uso pode deixar matrículas
 * legadas em estado inconsistente. A validação "scope é seguro mudar
 * agora?" fica fora desta fase — quando a UI estiver pronta, o use case
 * pode receber um `RepositoryQueries` pra checar conflitos antes.
 */
export class UpdateOrganizationPreferencesUseCase {
  constructor(private readonly repo: OrganizationPreferencesRepository) {}

  async execute(input: Input): Promise<OrganizationPreferences> {
    const existing = await this.repo.findByOrg(input.organizationId);
    const prefs =
      existing ?? OrganizationPreferences.defaultsFor(input.organizationId);

    if (input.matriculaScope !== undefined) {
      prefs.changeMatriculaScope(input.matriculaScope);
    }

    await this.repo.save(prefs);
    return prefs;
  }
}
