import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica assinatura de webhook do Resend Inbound. Resend usa Svix —
 * mesmo formato de signature usado em Stripe-like providers:
 *
 *   - Header `svix-id`         → ID único do evento
 *   - Header `svix-timestamp`  → Unix timestamp em segundos
 *   - Header `svix-signature`  → "v1,<base64-sig> [v1,<sig2> ...]"
 *
 * Computação:
 *   secret = base64.decode(secret_sem_prefixo_whsec_)
 *   signed_content = svix-id . svix-timestamp . body
 *   expected = base64(hmac_sha256(secret, signed_content))
 *
 * Comparação timing-safe contra todas as sigs no header (rotação de
 * secret pode resultar em múltiplas).
 *
 * Implementado sem a lib `svix` pra não trazer mais uma dep — a
 * computação é trivial.
 */

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export function verifyResendInboundWebhook(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  const svixId = pickHeader(headers, "svix-id");
  const svixTimestamp = pickHeader(headers, "svix-timestamp");
  const svixSignature = pickHeader(headers, "svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Replay protection — rejeita timestamps muito antigos/no futuro.
  const ts = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  // Decode secret. Resend devolve no formato "whsec_<base64>". Removemos
  // o prefixo antes de decodar.
  const secretClean = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretClean, "base64");
  } catch {
    return false;
  }
  if (secretBytes.length === 0) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString("utf-8")}`;
  const expected = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected, "utf-8");

  // Header pode trazer múltiplas sigs separadas por espaço. Cada uma
  // no formato `v1,<base64>`. Match em qualquer uma vale.
  for (const part of svixSignature.split(" ")) {
    const idx = part.indexOf(",");
    if (idx <= 0) continue;
    const version = part.slice(0, idx);
    const sig = part.slice(idx + 1);
    if (version !== "v1" || !sig) continue;
    const sigBuf = Buffer.from(sig, "utf-8");
    if (sigBuf.length !== expectedBuf.length) continue;
    try {
      if (timingSafeEqual(sigBuf, expectedBuf)) return true;
    } catch {
      // length mismatch tarde — só ignora
    }
  }
  return false;
}

function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const v = headers[name] ?? headers[name.toLowerCase()];
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim();
  return null;
}
