import type { TeacherAssistantRepository } from "../domain/teacher-assistant-repository.js";
import { AssistantTargetNotAvailableError } from "../domain/teacher-assistant-errors.js";

interface Input {
  assistantUserId: string;
  teacherUserId: string;
}

/**
 * Confere que existe vínculo ativo (assistente, professor) antes de
 * setar o cookie. Tudo que muda visibilidade no app passa por aqui.
 */
export class SelectAssistantTargetUseCase {
  constructor(private readonly repo: TeacherAssistantRepository) {}

  async execute(input: Input): Promise<void> {
    const link = await this.repo.findActiveLink(input);
    if (!link) throw new AssistantTargetNotAvailableError();
  }
}
