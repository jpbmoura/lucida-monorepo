import type {
  AddInstitutionMemberByUserIdInput,
  AddInstitutionMemberInput,
  AddInstitutionMemberResult,
  KintalInstitutionsRepository,
} from "./ports/kintal-institutions-repository.js";
import { InvalidInstitutionInputError } from "../domain/institutions-errors.js";

/**
 * Adiciona um membro a uma instituição via Kintal — sem invite por
 * email. Cobre dois caminhos:
 *
 * - **Por email** (tela de instituição): pode criar user novo se o
 *   email não existir (precisa `userName` + `password`).
 * - **Por userId** (tela de usuário): user resolvido pela tela do
 *   próprio user; nunca cria.
 *
 * Em ambos os casos a regra "1 user = 1 org" é checada — o repo recusa
 * se já houver membership.
 */
export class AddInstitutionMemberUseCase {
  constructor(private readonly repo: KintalInstitutionsRepository) {}

  async byEmail(
    input: AddInstitutionMemberInput,
  ): Promise<AddInstitutionMemberResult> {
    const userEmail = input.userEmail.trim().toLowerCase();
    if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
      throw new InvalidInstitutionInputError("Email inválido.");
    }
    return this.repo.addMember({
      organizationId: input.organizationId,
      userEmail,
      userName: input.userName?.trim() || undefined,
      password: input.password,
      role: input.role,
    });
  }

  async byUserId(input: AddInstitutionMemberByUserIdInput): Promise<void> {
    return this.repo.addMemberByUserId(input);
  }
}
