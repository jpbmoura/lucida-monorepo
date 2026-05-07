import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie auxiliar do impersonate de **instituição** (Kintal): carrega o
 * `organizationId` que o staff escolheu impersonar, pra que o middleware
 * `requireAuth` saiba qual org ativar — em vez de adivinhar pegando a
 * primeira membership do owner alvo.
 *
 * É opcional: ausência == impersonate de user comum (sem contexto de org).
 * Mesmo padrão do `lucida.impersonate` (HMAC-SHA256, base64url, HttpOnly).
 * Mesmo TTL pra expirar junto.
 */
export const IMPERSONATE_ORG_COOKIE_NAME = "lucida.impersonate_org";

export const IMPERSONATE_ORG_TTL_SECONDS = 8 * 60 * 60;

export interface ImpersonateOrgCookieAttributes {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function impersonateOrgCookieAttributes(input: {
  isProduction: boolean;
}): ImpersonateOrgCookieAttributes {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: input.isProduction,
    path: "/",
    // Express `res.cookie` espera `maxAge` em **milissegundos**.
    // Converte aqui pra manter o constant em segundos (mais legível).
    maxAge: IMPERSONATE_ORG_TTL_SECONDS * 1000,
  };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function buildImpersonateOrgCookieValue(
  organizationId: string,
  secret: string,
): string {
  return `${organizationId}.${sign(organizationId, secret)}`;
}

/** Retorna o `organizationId` se a assinatura bate; `null` caso contrário. */
export function parseImpersonateOrgCookieValue(
  raw: string | undefined,
  secret: string,
): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot >= raw.length - 1) return null;

  const organizationId = raw.slice(0, dot);
  const provided = raw.slice(dot + 1);
  const expected = sign(organizationId, secret);

  if (provided.length !== expected.length) return null;
  try {
    const ok = timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected),
    );
    return ok ? organizationId : null;
  } catch {
    return null;
  }
}
