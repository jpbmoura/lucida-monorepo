import type { TeacherAssistantRepository } from "../domain/teacher-assistant-repository.js";
import { NotAnAssistantError } from "../domain/teacher-assistant-errors.js";

interface Input {
  assistantUserId: string;
}

/**
 * Confere que o user é auxiliar de pelo menos um professor antes de
 * permitir que ele "entre na própria conta" carimbando o cookie de
 * target apontando pra si mesmo. Sem isso o endpoint viraria um
 * no-op pra qualquer user comum.
 */
export class SelectAssistantSelfTargetUseCase {
  constructor(private readonly repo: TeacherAssistantRepository) {}

  async execute(input: Input): Promise<void> {
    const count = await this.repo.countActiveTeachersForAssistant(
      input.assistantUserId,
    );
    if (count === 0) throw new NotAnAssistantError();
  }
}
