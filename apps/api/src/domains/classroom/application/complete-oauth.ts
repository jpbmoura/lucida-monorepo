import { ClassroomCredential } from "../domain/classroom-credential.js";
import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import type { ClassroomOAuthClient } from "./ports/classroom-oauth-client.js";
import { verifyClassroomOAuthState } from "./oauth-state.js";

interface Input {
  state: string;
  code: string;
}

/**
 * Fecha o fluxo OAuth: valida o `state`, troca o `code` por tokens, lê o
 * email da conta Google e persiste a credencial vinculada ao professor.
 * Idempotente por professor — reconectar sobrescreve a credencial (upsert
 * por `teacherId` no repositório).
 */
export class CompleteOAuthUseCase {
  constructor(
    private readonly oauth: ClassroomOAuthClient,
    private readonly credentials: ClassroomCredentialRepository,
    private readonly authSecret: string,
  ) {}

  async execute(input: Input): Promise<void> {
    const state = verifyClassroomOAuthState(input.state, this.authSecret);
    const tokens = await this.oauth.exchangeCode(input.code);
    const googleEmail = await this.oauth.fetchGoogleEmail(tokens.accessToken);

    // Reusa o id existente (se houver) pra manter o upsert estável.
    const existing = await this.credentials.findByTeacherId(state.userId);
    const credential = ClassroomCredential.create({
      id: existing?.id ?? this.credentials.nextId(),
      teacherId: state.userId,
      organizationId: state.organizationId,
      googleEmail,
      tokens,
    });
    await this.credentials.save(credential);
  }
}
