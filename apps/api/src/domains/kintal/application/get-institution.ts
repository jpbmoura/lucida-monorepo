import type {
  KintalInstitutionDetail,
  KintalInstitutionsRepository,
} from "./ports/kintal-institutions-repository.js";
import { InstitutionNotFoundError } from "../domain/institutions-errors.js";

export class GetInstitutionUseCase {
  constructor(private readonly repo: KintalInstitutionsRepository) {}

  async execute(orgId: string): Promise<KintalInstitutionDetail> {
    const detail = await this.repo.findById(orgId);
    if (!detail) throw new InstitutionNotFoundError();
    return detail;
  }
}
