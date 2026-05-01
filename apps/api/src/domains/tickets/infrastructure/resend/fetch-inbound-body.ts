import { env } from "@/env.js";

/**
 * Busca o corpo (text + html) de um email inbound via API do Resend.
 *
 * **Contexto**: o webhook do Resend Inbound entrega só metadata (from,
 * to, subject, message_id, attachments). O `email_id` no payload é o
 * ponteiro pra buscar o conteúdo completo.
 *
 * **API**: o endpoint específico de inbound do Resend ainda está
 * evoluindo. Tentamos múltiplos paths em ordem porque a doc não é
 * estável e diferentes contas/regiões respondem em endpoints
 * diferentes. O primeiro que retornar `text` ou `html` ganha.
 *
 * Logging é verboso de propósito — quando o body chega vazio em
 * produção, os logs do Railway mostram exatamente qual endpoint
 * foi tentado e o que veio na resposta.
 *
 * Falha total (todos endpoints rejeitam) → corpo vazio. Caller persiste
 * a mensagem mesmo assim — UI mostra ticket com bubble vazia, staff
 * debug via dashboard Resend olhando o `email_id`.
 */
export async function fetchInboundEmailBody(emailId: string): Promise<{
  text: string;
  html: string | null;
}> {
  if (!env.RESEND_API_KEY) {
    console.warn("[tickets] RESEND_API_KEY ausente — não tem como buscar body");
    return { text: "", html: null };
  }

  const headers = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };

  // Endpoints possíveis pra fetch de email inbound. Resend mudou a API
  // ao longo do tempo; tentamos do mais novo pro mais antigo.
  const candidates = [
    `https://api.resend.com/inbound-emails/${emailId}`,
    `https://api.resend.com/inbound/emails/${emailId}`,
    `https://api.resend.com/v1/inbound-emails/${emailId}`,
    `https://api.resend.com/emails/${emailId}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers });
      const status = res.status;
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // Não-JSON — ignora
      }

      console.log("[tickets] fetch inbound body attempt:", {
        emailId,
        url,
        status,
        bodyKeys:
          body && typeof body === "object" ? Object.keys(body) : null,
      });

      if (!res.ok) continue;

      const extracted = extractBody(body);
      if (extracted.text || extracted.html) {
        console.log("[tickets] fetch inbound body OK:", {
          emailId,
          url,
          textLen: extracted.text.length,
          htmlLen: extracted.html?.length ?? 0,
        });
        return extracted;
      }
    } catch (err) {
      console.warn(
        "[tickets] fetch inbound body endpoint erro:",
        url,
        (err as Error).message,
      );
    }
  }

  console.warn(
    "[tickets] fetch inbound body: todos endpoints falharam ou retornaram vazio",
    emailId,
  );
  return { text: "", html: null };
}

/**
 * Extrai text/html de uma resposta possivelmente aninhada. Resend
 * varia o shape: às vezes top-level, às vezes dentro de `data` ou
 * `email`. Tentamos múltiplos paths.
 */
function extractBody(payload: unknown): {
  text: string;
  html: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { text: "", html: null };
  }
  const obj = payload as Record<string, unknown>;
  const candidates = [
    obj,
    obj.data as Record<string, unknown> | undefined,
    obj.email as Record<string, unknown> | undefined,
    obj.message as Record<string, unknown> | undefined,
  ];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const text = typeof c.text === "string" ? c.text : "";
    const html = typeof c.html === "string" ? c.html : null;
    if (text || html) return { text, html };
  }
  return { text: "", html: null };
}
