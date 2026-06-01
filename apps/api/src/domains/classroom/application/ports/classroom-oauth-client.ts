import type { OAuthTokens } from "../../domain/oauth-tokens.js";

/**
 * Porta do fluxo OAuth próprio da integração (separado do login Better
 * Auth). Implementada por `GoogleClassroomOAuthClient`. Quando a integração
 * não está configurada, o composition root injeta um stub que lança
 * `ClassroomNotConfiguredError`.
 */
export interface ClassroomOAuthClient {
  /**
   * Monta a URL de consentimento do Google. `state` é um token assinado que
   * carrega a identidade do professor (verificado no callback). Usa
   * `access_type=offline` + `prompt=consent` pra garantir refresh token.
   */
  buildConsentUrl(state: string): string;
  /** Troca o `code` do callback pelos tokens. */
  exchangeCode(code: string): Promise<OAuthTokens>;
  /** Renova o access token a partir de um refresh token. */
  refresh(refreshToken: string): Promise<OAuthTokens>;
  /**
   * Lê o email da conta Google autorizada (userinfo). Usado pra exibir qual
   * conta está vinculada no card da integração.
   */
  fetchGoogleEmail(accessToken: string): Promise<string>;
}
