import type { ClassroomOAuthClient } from "../application/ports/classroom-oauth-client.js";
import type { OAuthTokens } from "../domain/oauth-tokens.js";
import {
  ClassroomApiError,
  ClassroomReauthRequiredError,
} from "../domain/classroom-errors.js";

/**
 * Escopos da integração (FASE 1 — só leitura). Os de escrita (coursework)
 * entram nas fases 2/3 — ver docs/INTEGRACAO_GOOGLE_CLASSROOM.md.
 */
export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails",
];

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERPROFILE_ME = "https://classroom.googleapis.com/v1/userProfiles/me";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export class GoogleClassroomOAuthClient implements ClassroomOAuthClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  buildConsentUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: CLASSROOM_SCOPES.join(" "),
      // offline + consent garantem o refresh token (mesmo em reconexões).
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `${AUTH_ENDPOINT}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: "authorization_code",
    });
    const data = await this.postToken(body);
    return this.toTokens(data);
  }

  async refresh(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
    });
    const data = await this.postToken(body, { reauthOnInvalidGrant: true });
    // No refresh, o Google normalmente não reemite o refresh_token.
    return this.toTokens(data);
  }

  async fetchGoogleEmail(accessToken: string): Promise<string> {
    const res = await fetch(USERPROFILE_ME, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new ClassroomApiError(
        `Falha ao ler o perfil Google (${res.status}).`,
      );
    }
    const json = (await res.json()) as { emailAddress?: string };
    if (!json.emailAddress) {
      throw new ClassroomApiError("Perfil Google sem email visível.");
    }
    return json.emailAddress;
  }

  private async postToken(
    body: URLSearchParams,
    opts: { reauthOnInvalidGrant?: boolean } = {},
  ): Promise<GoogleTokenResponse> {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!res.ok || data.error) {
      if (opts.reauthOnInvalidGrant && data.error === "invalid_grant") {
        throw new ClassroomReauthRequiredError();
      }
      throw new ClassroomApiError(
        `Erro OAuth do Google: ${data.error ?? res.status} ${
          data.error_description ?? ""
        }`.trim(),
      );
    }
    return data;
  }

  private toTokens(data: GoogleTokenResponse): OAuthTokens {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 0) * 1000),
      scopes: data.scope ? data.scope.split(" ") : [...CLASSROOM_SCOPES],
    };
  }
}
