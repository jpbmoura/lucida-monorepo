import type { KintalInstitutionsRepository } from "./ports/kintal-institutions-repository.js";
import { InstitutionNotFoundError } from "../domain/institutions-errors.js";
import { InstitutionWithoutOwnerError } from "../domain/impersonate-errors.js";
import type {
  StartKintalImpersonateOutput,
  StartKintalImpersonateUseCase,
} from "./start-kintal-impersonate.js";

export interface StartInstitutionImpersonateInput {
  staffUserId: string;
  organizationId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface StartInstitutionImpersonateOutput
  extends StartKintalImpersonateOutput {
  organizationId: string;
}

/**
 * Inicia uma sessão de impersonate "como instituição": resolve o owner
 * da org e delega pro fluxo padrão de impersonate de user. O staff
 * passa a navegar como o owner — o que dá acesso total ao
 * `/analytics` da instituição via `requireOrgAdmin`.
 *
 * Não escala pra admin/member quando não há owner — o use case falha
 * (botão de UI fica desabilitado). Trocar dono é uma operação manual
 * de staff, não automática.
 */
export class StartInstitutionImpersonateUseCase {
  constructor(
    private readonly institutions: KintalInstitutionsRepository,
    private readonly startUserImpersonate: StartKintalImpersonateUseCase,
  ) {}

  async execute(
    input: StartInstitutionImpersonateInput,
  ): Promise<StartInstitutionImpersonateOutput> {
    const detail = await this.institutions.findById(input.organizationId);
    if (!detail) throw new InstitutionNotFoundError();

    const owner = detail.members.find((m) => m.role === "owner");
    if (!owner) throw new InstitutionWithoutOwnerError();

    const result = await this.startUserImpersonate.execute({
      staffUserId: input.staffUserId,
      targetUserId: owner.id,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    return { ...result, organizationId: input.organizationId };
  }
}
