import type { ClassroomOAuthClient } from "../application/ports/classroom-oauth-client.js";
import type { OAuthTokens } from "../domain/oauth-tokens.js";
import { ClassroomNotConfiguredError } from "../domain/classroom-errors.js";

/**
 * Stub usado quando as envs CLASSROOM_OAUTH_* não estão configuradas —
 * qualquer tentativa de conectar devolve 503 amigável. Degradação graciosa,
 * igual ao UnavailableOmrClient.
 */
export class UnavailableClassroomOAuthClient implements ClassroomOAuthClient {
  buildConsentUrl(): never {
    throw new ClassroomNotConfiguredError();
  }
  async exchangeCode(): Promise<OAuthTokens> {
    throw new ClassroomNotConfiguredError();
  }
  async refresh(): Promise<OAuthTokens> {
    throw new ClassroomNotConfiguredError();
  }
  async fetchGoogleEmail(): Promise<string> {
    throw new ClassroomNotConfiguredError();
  }
}
