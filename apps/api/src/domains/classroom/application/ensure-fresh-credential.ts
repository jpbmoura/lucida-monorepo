import type { ClassroomCredential } from "../domain/classroom-credential.js";
import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import type { ClassroomOAuthClient } from "./ports/classroom-oauth-client.js";

/**
 * Garante que a credencial tem um access token válido antes de qualquer
 * chamada REST. Se expirou, renova via refresh token e persiste (re-cifrado
 * pelo repositório). Encapsula o `withFreshToken` do plano.
 *
 * Se o refresh falhar (token revogado), o `ClassroomOAuthClient` lança
 * `ClassroomReauthRequiredError`, que sobe até o controller — o resto da
 * Lucida segue funcionando, só essa integração pede reconexão.
 */
export class EnsureFreshCredentialService {
  constructor(
    private readonly oauth: ClassroomOAuthClient,
    private readonly credentials: ClassroomCredentialRepository,
  ) {}

  async execute(credential: ClassroomCredential): Promise<ClassroomCredential> {
    if (!credential.isExpired()) return credential;

    const refreshed = await this.oauth.refresh(credential.refreshToken);
    credential.applyRefreshedTokens(refreshed);
    await this.credentials.save(credential);
    return credential;
  }
}
