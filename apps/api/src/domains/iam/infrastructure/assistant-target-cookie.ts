import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie de alvo do auxiliar — qual professor ele está atendendo agora.
 * Cardinalidade N:N exige escolha; o seletor `/auxiliar/escolher` posta
 * pra `/v1/iam/assistant/select` que seta este cookie.
 *
 * Espelha `impersonate-cookie.ts`: HttpOnly + SameSite=lax, valor
 * `<teacherUserId>.<HMAC-SHA256-base64url>`. Sem assinatura válida, o
 * middleware ignora silenciosamente.
 */
export const ASSISTANT_TARGET_COOKIE_NAME = "lucida.assistant_target";

export const ASSISTANT_TARGET_TTL_SECONDS = 8 * 60 * 60;

export interface AssistantTargetCookieAttributes {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function assistantTargetCookieAttributes(input: {
  isProduction: boolean;
}): AssistantTargetCookieAttributes {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: input.isProduction,
    path: "/",
    maxAge: ASSISTANT_TARGET_TTL_SECONDS,
  };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function buildAssistantTargetCookieValue(
  teacherUserId: string,
  secret: string,
): string {
  return `${teacherUserId}.${sign(teacherUserId, secret)}`;
}

export function parseAssistantTargetCookieValue(
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
    const ok = timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    return ok ? teacherId : null;
  } catch {
    return null;
  }
}
