import type { StaffRepository } from "./ports/staff-repository.js";
import { CannotRevokeSelfError } from "../domain/staff-errors.js";

interface Input {
  targetUserId: string;
  requesterUserId: string;
}

/**
 * Demote a staff back to regular user. Auto-demoção é bloqueada aqui —
 * o front também trava (botão disabled na própria linha), mas a defesa do
 * servidor continua valendo pra quem tentar bater na API direto.
 */
export class RevokeStaffUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(input: Input): Promise<void> {
    if (input.targetUserId === input.requesterUserId) {
      throw new CannotRevokeSelfError();
    }
    // Idempotente: se o user não é staff, o unset não faz nada. Não
    // retornamos 404 nem 409 aqui — a operação "tornar não-staff" é
    // segura de rodar duas vezes.
    await this.repo.revokeStaff(input.targetUserId);
  }
}
