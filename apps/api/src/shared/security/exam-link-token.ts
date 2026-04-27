import { createHmac, timingSafeEqual } from "node:crypto";
import { DomainError } from "@/shared/errors/domain-error.js";

/**
 * Token compacto pra link de prova com matrícula bloqueada. Formato:
 *
 *   `<base64url(payload)>.<base64url(hmac)>`
 *
 * onde:
 *   - payload = JSON({ examId, studentId, iat })
 *   - hmac    = HMAC_SHA256(AUTH_SECRET, payload-base64url)
 *
 * Não é JWT — formato proprietário pra evitar dependência externa e
 * complexidade desnecessária. Sem `exp` por decisão de produto: os links
 * são reusáveis até a prova ser finalizada (a checagem fica no fluxo de
 * begin, não no token).
 *
 * Comparação em tempo constante via `timingSafeEqual` pra evitar timing
 * attacks no parsing do hmac.
 */

export interface ExamLinkPayload {
  examId: string;
  studentId: string;
  /** Issued at (unix seconds). Útil pra logs/auditoria — não pra expiração. */
  iat: number;
}

export class InvalidExamLinkTokenError extends DomainError {
  readonly code = "INVALID_EXAM_LINK_TOKEN";
  readonly statusCode = 401;
  constructor() {
    super("Token de link de prova inválido ou adulterado.");
  }
}

export function signExamLinkToken(
  payload: Omit<ExamLinkPayload, "iat"> & { iat?: number },
  secret: string,
): string {
  const full: ExamLinkPayload = {
    examId: payload.examId,
    studentId: payload.studentId,
    iat: payload.iat ?? Math.floor(Date.now() / 1000),
  };
  const payloadB64 = Buffer.from(JSON.stringify(full), "utf8").toString(
    "base64url",
  );
  const hmac = createHmac("sha256", secret).update(payloadB64).digest();
  const hmacB64 = hmac.toString("base64url");
  return `${payloadB64}.${hmacB64}`;
}

export function verifyExamLinkToken(
  token: string,
  secret: string,
): ExamLinkPayload {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1 || dotIndex === token.length - 1) {
    throw new InvalidExamLinkTokenError();
  }

  const payloadB64 = token.slice(0, dotIndex);
  const receivedHmacB64 = token.slice(dotIndex + 1);

  const expectedHmac = createHmac("sha256", secret).update(payloadB64).digest();

  let receivedHmac: Buffer;
  try {
    receivedHmac = Buffer.from(receivedHmacB64, "base64url");
  } catch {
    throw new InvalidExamLinkTokenError();
  }

  if (
    receivedHmac.length !== expectedHmac.length ||
    !timingSafeEqual(receivedHmac, expectedHmac)
  ) {
    throw new InvalidExamLinkTokenError();
  }

  let payload: ExamLinkPayload;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    payload = JSON.parse(json) as ExamLinkPayload;
  } catch {
    throw new InvalidExamLinkTokenError();
  }

  if (
    typeof payload.examId !== "string" ||
    typeof payload.studentId !== "string" ||
    typeof payload.iat !== "number"
  ) {
    throw new InvalidExamLinkTokenError();
  }

  return payload;
}
