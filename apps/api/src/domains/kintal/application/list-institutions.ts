import type {
  KintalInstitutionListItem,
  KintalInstitutionsRepository,
  ListKintalInstitutionsFilter,
} from "./ports/kintal-institutions-repository.js";

export class ListInstitutionsUseCase {
  constructor(private readonly repo: KintalInstitutionsRepository) {}

  execute(
    filter: ListKintalInstitutionsFilter,
  ): Promise<KintalInstitutionListItem[]> {
    return this.repo.list(filter);
  }
}
