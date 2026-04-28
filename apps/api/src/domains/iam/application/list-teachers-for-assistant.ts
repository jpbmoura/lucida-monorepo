import type {
  TeacherAssistantRepository,
  TeacherWithMeta,
} from "../domain/teacher-assistant-repository.js";

interface Input {
  assistantUserId: string;
}

/**
 * Lista os professores aos quais o auxiliar logado pode atender. Já
 * filtra por professores que ainda são members ativos da org —
 * vínculos órfãos (professor saiu da org) somem do seletor.
 */
export class ListTeachersForAssistantUseCase {
  constructor(private readonly repo: TeacherAssistantRepository) {}

  execute(input: Input): Promise<TeacherWithMeta[]> {
    return this.repo.listTeachersForAssistant(input);
  }
}
