/**
 * Verificação do webhook AbacatePay v2.
 *
 * O painel da AbacatePay exige um Secret no cadastro do webhook. A doc
 * pública não fixa um único formato de entrega; observados em campo:
 *
 *   1. Query param `?webhookSecret=<secret>` (formato citado nos
 *      tutoriais públicos e no SDK legado).
 *   2. Header `x-webhook-secret: <secret>` (variação comum em v2).
 *   3. Header `authorization: Bearer <secret>` (alguns provedores).
 *
 * A função aceita os três pra ser resiliente a mudanças do upstream sem
 * exigir refatoração imediata. Se a AbacatePay padronizar um deles
 * exclusivamente, dá pra apertar aqui depois.
 *
 * Comparação em tempo constante pra evitar timing attack.
 */
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

export function verifyAbacatePayWebhook(
  req: Request,
  expectedSecret: string,
): boolean {
  const candidates = collectCandidates(req);
  for (const candidate of candidates) {
    if (constantTimeEquals(candidate, expectedSecret)) return true;
  }
  return false;
}

function collectCandidates(req: Request): string[] {
  const out: string[] = [];

  const queryValue = req.query.webhookSecret;
  if (typeof queryValue === "string") out.push(queryValue);

  const header = req.headers["x-webhook-secret"];
  if (typeof header === "string") out.push(header);

  const auth = req.headers["authorization"];
  if (typeof auth === "string") {
    const trimmed = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    out.push(trimmed);
  }

  return out;
}

function constantTimeEquals(received: string, expected: string): boolean {
  if (received.length !== expected.length) {
    // timingSafeEqual exige buffers do mesmo tamanho — falhar cedo aqui
    // é seguro: comprimentos diferentes já são match impossível.
    return false;
  }
  try {
    return timingSafeEqual(
      Buffer.from(received, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  } catch {
    return false;
  }
}
