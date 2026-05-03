import type {
  KintalInstitutionsRepository,
  RemoveInstitutionMemberInput,
} from "./ports/kintal-institutions-repository.js";

/**
 * Remove o vínculo de um user com uma instituição via Kintal. Owner
 * não pode ser removido — staff deve arquivar a instituição se quiser
 * desfazê-la.
 */
export class RemoveInstitutionMemberUseCase {
  constructor(private readonly repo: KintalInstitutionsRepository) {}

  async execute(input: RemoveInstitutionMemberInput): Promise<void> {
    return this.repo.removeMember(input);
  }
}
