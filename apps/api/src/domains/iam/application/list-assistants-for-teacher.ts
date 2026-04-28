import type {
  AssistantWithUser,
  TeacherAssistantRepository,
} from "../domain/teacher-assistant-repository.js";

interface Input {
  teacherUserId: string;
  organizationId: string;
}

export class ListAssistantsForTeacherUseCase {
  constructor(private readonly repo: TeacherAssistantRepository) {}

  execute(input: Input): Promise<AssistantWithUser[]> {
    return this.repo.listAssistantsForTeacher(input);
  }
}
