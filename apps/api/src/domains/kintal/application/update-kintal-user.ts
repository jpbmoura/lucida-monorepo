import type { KintalUsersRepository } from "./ports/kintal-users-repository.js";
import { KintalUserNotFoundError } from "../domain/users-errors.js";

export interface UpdateKintalUserInput {
  userId: string;
  patch: {
    name?: string;
    whatsapp?: string | null;
    institutionType?: string | null;
    stateUf?: string | null;
    studentsRange?: string | null;
    teachingYears?: string | null;
    acquisitionChannel?: string | null;
  };
}

/**
 * Atualiza dados editáveis do user a partir do Kintal. Não toca em
 * email/role/staffSince — esses ficam isolados pra evitar abuso (email é
 * identidade, role é gestão de acesso → /kintal/acessos).
 */
export class UpdateKintalUserUseCase {
  constructor(private readonly users: KintalUsersRepository) {}

  async execute(input: UpdateKintalUserInput): Promise<void> {
    const existing = await this.users.findById(input.userId);
    if (!existing) throw new KintalUserNotFoundError();

    await this.users.update(input.userId, input.patch);
  }
}
