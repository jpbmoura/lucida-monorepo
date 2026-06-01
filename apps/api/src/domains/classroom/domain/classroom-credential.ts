import type { OAuthTokens } from "./oauth-tokens.js";

/**
 * Credencial OAuth do professor para a integração Google Classroom.
 *
 * Os tokens vivem em texto plano DENTRO da entidade (em memória) — a cifra
 * em repouso é responsabilidade do repositório (infra), que recebe um
 * `TokenCipher` e cifra/decifra na fronteira do Mongo. Assim o domínio e os
 * use cases nunca lidam com blobs cifrados.
 *
 * Uma credencial por professor (`teacherId` é o BetterAuth userId). A conta
 * Google vale para todas as orgs em que o professor atua — o token é da
 * pessoa, não da org. `organizationId` fica como contexto da conexão.
 */

/** Margem de segurança: renova o token se faltar menos que isso pra expirar. */
const EXPIRY_SKEW_SECONDS = 60;

export interface ClassroomCredentialProps {
  id: string;
  teacherId: string;
  organizationId: string | null;
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ClassroomCredential {
  private constructor(private props: ClassroomCredentialProps) {}

  static create(input: {
    id: string;
    teacherId: string;
    organizationId: string | null;
    googleEmail: string;
    tokens: OAuthTokens;
    now?: Date;
  }): ClassroomCredential {
    if (!input.tokens.refreshToken) {
      // Sem refresh token não conseguimos renovar — exigimos `prompt=consent`
      // justamente pra garantir que ele venha na primeira conexão.
      throw new Error(
        "Refresh token ausente — o consentimento precisa usar access_type=offline + prompt=consent.",
      );
    }
    const now = input.now ?? new Date();
    return new ClassroomCredential({
      id: input.id,
      teacherId: input.teacherId,
      organizationId: input.organizationId,
      googleEmail: input.googleEmail,
      accessToken: input.tokens.accessToken,
      refreshToken: input.tokens.refreshToken,
      expiresAt: input.tokens.expiresAt,
      scopes: input.tokens.scopes,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ClassroomCredentialProps): ClassroomCredential {
    return new ClassroomCredential({ ...props, scopes: [...props.scopes] });
  }

  get id(): string {
    return this.props.id;
  }
  get teacherId(): string {
    return this.props.teacherId;
  }
  get organizationId(): string | null {
    return this.props.organizationId;
  }
  get googleEmail(): string {
    return this.props.googleEmail;
  }
  get accessToken(): string {
    return this.props.accessToken;
  }
  get refreshToken(): string {
    return this.props.refreshToken;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get scopes(): string[] {
    return [...this.props.scopes];
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** True se o access token expirou (ou está prestes a) e precisa de refresh. */
  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() - now.getTime() <= EXPIRY_SKEW_SECONDS * 1000;
  }

  /**
   * Aplica tokens renovados (vindos de um refresh). O Google costuma NÃO
   * reemitir refresh token no refresh — nesse caso mantemos o atual.
   */
  applyRefreshedTokens(tokens: OAuthTokens, now: Date = new Date()): void {
    this.props.accessToken = tokens.accessToken;
    if (tokens.refreshToken) {
      this.props.refreshToken = tokens.refreshToken;
    }
    this.props.expiresAt = tokens.expiresAt;
    if (tokens.scopes.length > 0) {
      this.props.scopes = [...tokens.scopes];
    }
    this.props.updatedAt = now;
  }
}
