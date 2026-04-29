import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica HMAC-SHA256 do body do webhook NFE.io. Cabeçalho aceito —
 * NFE.io evoluiu e diferentes contas podem receber em headers diferentes:
 *   - `x-hub-signature-256: sha256=<hex>`     (padrão GitHub-style atual)
 *   - `x-webhook-signature: <hex|base64>`     (legado)
 *   - `x-nfeio-signature: <hex>`              (algumas integrações antigas)
 *
 * Tenta extrair de qualquer um; se nenhum bater, falha. Comparação
 * timing-safe pra evitar oráculo de timing.
 *
 * **TODO em produção:** confirmar com NFE.io qual header eles assinam
 * pra essa conta e simplificar pra um só. Sandbox geralmente expõe via
 * `x-hub-signature-256`.
 */
export function verifyNfeIoWebhook(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  const candidate = extractSignature(headers);
  if (!candidate) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest();

  // Tenta hex, depois base64 — alguns providers usam um, outros outro.
  const fromHex = tryDecode(candidate, "hex");
  if (fromHex && safeEqual(expected, fromHex)) return true;
  const fromBase64 = tryDecode(candidate, "base64");
  if (fromBase64 && safeEqual(expected, fromBase64)) return true;

  return false;
}

function extractSignature(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const candidates = [
    pickHeader(headers, "x-hub-signature-256"),
    pickHeader(headers, "x-webhook-signature"),
    pickHeader(headers, "x-nfeio-signature"),
  ].filter((v): v is string => Boolean(v));

  for (const raw of candidates) {
    // GitHub-style: `sha256=<hex>`. Tira o prefixo se houver.
    const stripped = raw.startsWith("sha256=") ? raw.slice(7) : raw;
    if (stripped) return stripped;
  }
  return null;
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

function tryDecode(value: string, enc: "hex" | "base64"): Buffer | null {
  try {
    const buf = Buffer.from(value, enc);
    // Buffer.from('xyz', 'hex') silenciosamente devolve algo se a string
    // não for hex válido — comparar tamanho com SHA-256 (32 bytes) filtra.
    if (enc === "hex" && buf.length !== 32) return null;
    return buf;
  } catch {
    return null;
  }
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
