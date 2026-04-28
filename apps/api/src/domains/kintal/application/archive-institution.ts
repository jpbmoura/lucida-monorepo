import type { KintalInstitutionsRepository } from "./ports/kintal-institutions-repository.js";
import { InstitutionNotFoundError } from "../domain/institutions-errors.js";

/**
 * Soft-delete da instituição: seta `archivedAt` na collection `organization`.
 * Membros, wallets e ledger ficam preservados; a org some das listagens
 * default e bloqueia novos checkouts (responsabilidade do front + future
 * gating). Reverter via `UnarchiveInstitutionUseCase`.
 */
export class ArchiveInstitutionUseCase {
  constructor(private readonly repo: KintalInstitutionsRepository) {}

  async execute(orgId: string): Promise<void> {
    const exists = await this.repo.exists(orgId);
    if (!exists) throw new InstitutionNotFoundError();
    await this.repo.archive(orgId);
  }
}

export class UnarchiveInstitutionUseCase {
  constructor(private readonly repo: KintalInstitutionsRepository) {}

  async execute(orgId: string): Promise<void> {
    const exists = await this.repo.exists(orgId);
    if (!exists) throw new InstitutionNotFoundError();
    await this.repo.unarchive(orgId);
  }
}
