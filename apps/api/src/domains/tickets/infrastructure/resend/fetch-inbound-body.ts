import { env } from "@/env.js";

/**
 * Busca o corpo (text + html) de um email inbound via API do Resend.
 *
 * **Endpoint** (per docs https://resend.com/docs/api-reference/emails/retrieve-received-email):
 *
 *   GET https://api.resend.com/emails/receiving/{id}
 *   Authorization: Bearer {api_key}
 *
 * Response inclui `text`, `html`, `headers`, `attachments` (metadata),
 * `raw.download_url` (link signed pra baixar .eml original).
 *
 * **Por que precisamos**: o webhook `email.received` entrega só metadata
 * (from/to/subject/email_id/attachments). Body só via essa rota.
 *
 * Falha (rede, 404, key inválida) → corpo vazio. Caller persiste a
 * mensagem mesmo assim — UI mostra ticket sem corpo + log de aviso pra
 * staff debugar via dashboard Resend.
 */
export async function fetchInboundEmailBody(emailId: string): Promise<{
  text: string;
  html: string | null;
}> {
  if (!env.RESEND_API_KEY) {
    return { text: "", html: null };
  }

  const url = `https://api.resend.com/emails/receiving/${emailId}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[tickets] fetch inbound body falhou:", {
        emailId,
        status: res.status,
        detail: detail.slice(0, 200),
      });
      return { text: "", html: null };
    }

    const data = (await res.json()) as {
      text?: string | null;
      html?: string | null;
    };

    const text = data.text ?? "";
    const html = data.html ?? null;
    console.log("[tickets] fetch inbound body OK:", {
      emailId,
      textLen: text.length,
      htmlLen: html?.length ?? 0,
    });
    return { text, html };
  } catch (err) {
    console.error("[tickets] fetch inbound body erro inesperado:", {
      emailId,
      error: (err as Error).message,
    });
    return { text: "", html: null };
  }
}
