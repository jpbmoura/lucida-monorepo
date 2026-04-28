import type { OrgBillingMode } from "@/domains/billing/domain/billing-mode.js";
import type {
  CreateInstitutionResult,
  KintalInstitutionsRepository,
} from "./ports/kintal-institutions-repository.js";
import { InvalidInstitutionInputError } from "../domain/institutions-errors.js";

export interface CreateInstitutionInputDTO {
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
  orgName: string;
  orgSlug: string;
  billingMode: OrgBillingMode;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/**
 * Cria uma nova instituição (user owner + organization + membership +
 * billing settings) via Kintal. Validação de input é feita aqui pra
 * garantir que callers diretos da camada (testes) passem por elas.
 */
export class CreateInstitutionUseCase {
  constructor(private readonly repo: KintalInstitutionsRepository) {}

  async execute(
    input: CreateInstitutionInputDTO,
  ): Promise<CreateInstitutionResult> {
    const ownerEmail = input.ownerEmail.trim().toLowerCase();
    const ownerName = input.ownerName.trim();
    const orgName = input.orgName.trim();
    const orgSlug = input.orgSlug.trim().toLowerCase();

    if (!ownerEmail || !/^\S+@\S+\.\S+$/.test(ownerEmail)) {
      throw new InvalidInstitutionInputError("Email do owner inválido.");
    }
    if (!ownerName) {
      throw new InvalidInstitutionInputError("Informe o nome do owner.");
    }
    if (input.ownerPassword.length < 8) {
      throw new InvalidInstitutionInputError(
        "Senha precisa ter pelo menos 8 caracteres.",
      );
    }
    if (!orgName) {
      throw new InvalidInstitutionInputError("Informe o nome da instituição.");
    }
    if (!SLUG_RE.test(orgSlug)) {
      throw new InvalidInstitutionInputError(
        "Slug inválido (use letras minúsculas, números e traço, 2–40 caracteres).",
      );
    }

    return this.repo.create({
      ownerEmail,
      ownerName,
      ownerPassword: input.ownerPassword,
      orgName,
      orgSlug,
      billingMode: input.billingMode,
    });
  }
}
