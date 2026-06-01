import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";

interface Input {
  teacherId: string;
}

/**
 * Desconecta a conta Google do professor (apaga a credencial). As turmas já
 * importadas e o vínculo `classroomCourseId` permanecem — só o acesso ao
 * Google é revogado localmente. Reconectar depois reimporta sem duplicar.
 */
export class DisconnectClassroomUseCase {
  constructor(private readonly credentials: ClassroomCredentialRepository) {}

  async execute(input: Input): Promise<void> {
    await this.credentials.deleteByTeacherId(input.teacherId);
  }
}
