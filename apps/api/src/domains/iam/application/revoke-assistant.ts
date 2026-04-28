import type { TeacherAssistantRepository } from "../domain/teacher-assistant-repository.js";
import { AssistantNotFoundError } from "../domain/teacher-assistant-errors.js";

interface Input {
  linkId: string;
  /** Org ativa do admin — confere que o link pertence à org. */
  organizationId: string;
}

/**
 * Soft-revoke do vínculo. Auxiliar continua existindo no BA — pode estar
 * linkado a outros professores. Este link específico fica `revokedAt =
 * now()` e o middleware passa a ignorar.
 */
export class RevokeAssistantUseCase {
  constructor(private readonly repo: TeacherAssistantRepository) {}

  async execute(input: Input): Promise<void> {
    const link = await this.repo.findById(input.linkId);
    if (!link) throw new AssistantNotFoundError();
    if (link.organizationId !== input.organizationId) {
      // Esconde existência cross-org devolvendo 404 em vez de 403.
      throw new AssistantNotFoundError();
    }
    if (!link.isActive()) return;
    link.revoke();
    await this.repo.save(link);
  }
}
