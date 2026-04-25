import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie de impersonate — independente da sessão BA. Carrega `teacherId.sig`
 * onde `sig` é HMAC-SHA256(`teacherId`, AUTH_SECRET) em base64url. Validação
 * usa comparação constant-time (`timingSafeEqual`) pra evitar timing attacks.
 *
 * Nome do cookie segue o prefixo "lucida." da BA pra ficar consistente. É
 * HttpOnly + SameSite=lax — o frontend nunca precisa ler diretamente, só
 * dispara endpoints pra setar/limpar.
 */
export const IMPERSONATE_COOKIE_NAME = "lucida.impersonate";

/** Sessão de impersonate dura 8h por padrão — janela de trabalho. */
export const IMPERSONATE_TTL_SECONDS = 8 * 60 * 60;

export interface ImpersonateCookieAttributes {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function impersonateCookieAttributes(input: {
  isProduction: boolean;
}): ImpersonateCookieAttributes {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: input.isProduction,
    path: "/",
    maxAge: IMPERSONATE_TTL_SECONDS,
  };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function buildImpersonateCookieValue(
  teacherId: string,
  secret: string,
): string {
  return `${teacherId}.${sign(teacherId, secret)}`;
}

/** Retorna o `teacherId` se a assinatura bate; `null` caso contrário. */
export function parseImpersonateCookieValue(
  raw: string | undefined,
  secret: string,
): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot >= raw.length - 1) return null;

  const teacherId = raw.slice(0, dot);
  const provided = raw.slice(dot + 1);
  const expected = sign(teacherId, secret);

  if (provided.length !== expected.length) return null;
  try {
    const ok = timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected),
    );
    return ok ? teacherId : null;
  } catch {
    return null;
  }
}
