/**
 * Tokens OAuth crus, como vêm do Google. NÃO são persistidos assim —
 * `accessToken`/`refreshToken` são cifrados antes de ir pro banco (ver
 * `ClassroomCredential` + `TokenCipher`). Este VO trafega só em memória,
 * entre o `ClassroomOAuthClient` e os use cases.
 */
export interface OAuthTokens {
  accessToken: string;
  /**
   * Refresh token. Pode vir `null` em re-consentimentos onde o Google
   * decide não reemitir (por isso usamos `prompt=consent`, que força a
   * reemissão). Quando null, mantemos o refresh token anterior.
   */
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string[];
}
