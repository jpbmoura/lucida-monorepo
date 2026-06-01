import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ClassroomInvalidOAuthStateError } from "../domain/classroom-errors.js";

/**
 * `state` assinado pro fluxo OAuth do Classroom. Mesmo formato proprietário
 * de `shared/security/exam-link-token.ts`:
 *
 *   `<base64url(payload)>.<base64url(hmac)>`
 *
 * Carrega a identidade do professor pro callback público conseguir saber de
 * quem é o consentimento sem depender de cookie cross-origin. Tem `exp`
 * curto (anti-replay) + `nonce` (CSRF). Assinado com AUTH_SECRET.
 */

const STATE_TTL_SECONDS = 10 * 60;

export interface ClassroomOAuthState {
  userId: string;
  organizationId: string | null;
  nonce: string;
  iat: number;
}

export function signClassroomOAuthState(
  input: { userId: string; organizationId: string | null; iat?: number },
  secret: string,
): string {
  const payload: ClassroomOAuthState = {
    userId: input.userId,
    organizationId: input.organizationId,
    nonce: randomBytes(12).toString("base64url"),
    iat: input.iat ?? Math.floor(Date.now() / 1000),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const hmacB64 = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${hmacB64}`;
}

export function verifyClassroomOAuthState(
  state: string,
  secret: string,
  now: Date = new Date(),
): ClassroomOAuthState {
  const dotIndex = state.indexOf(".");
  if (dotIndex === -1 || dotIndex === state.length - 1) {
    throw new ClassroomInvalidOAuthStateError();
  }

  const payloadB64 = state.slice(0, dotIndex);
  const receivedHmacB64 = state.slice(dotIndex + 1);

  const expectedHmac = createHmac("sha256", secret).update(payloadB64).digest();

  let receivedHmac: Buffer;
  try {
    receivedHmac = Buffer.from(receivedHmacB64, "base64url");
  } catch {
    throw new ClassroomInvalidOAuthStateError();
  }

  if (
    receivedHmac.length !== expectedHmac.length ||
    !timingSafeEqual(receivedHmac, expectedHmac)
  ) {
    throw new ClassroomInvalidOAuthStateError();
  }

  let payload: ClassroomOAuthState;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as ClassroomOAuthState;
  } catch {
    throw new ClassroomInvalidOAuthStateError();
  }

  if (
    typeof payload.userId !== "string" ||
    typeof payload.iat !== "number" ||
    (payload.organizationId !== null &&
      typeof payload.organizationId !== "string")
  ) {
    throw new ClassroomInvalidOAuthStateError();
  }

  const ageSeconds = Math.floor(now.getTime() / 1000) - payload.iat;
  if (ageSeconds < 0 || ageSeconds > STATE_TTL_SECONDS) {
    throw new ClassroomInvalidOAuthStateError();
  }

  return payload;
}
