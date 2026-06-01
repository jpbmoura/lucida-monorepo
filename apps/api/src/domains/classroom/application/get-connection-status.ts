import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";

interface Input {
  teacherId: string;
}

export interface ConnectionStatus {
  connected: boolean;
  /** Email da conta Google vinculada — só quando `connected`. */
  googleEmail: string | null;
}

/**
 * Estado da conexão do professor com o Google Classroom. Não fala com o
 * Google — só consulta a credencial local. Usado pelo card da integração.
 */
export class GetConnectionStatusUseCase {
  constructor(private readonly credentials: ClassroomCredentialRepository) {}

  async execute(input: Input): Promise<ConnectionStatus> {
    const credential = await this.credentials.findByTeacherId(input.teacherId);
    if (!credential) return { connected: false, googleEmail: null };
    return { connected: true, googleEmail: credential.googleEmail };
  }
}
