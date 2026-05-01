import { Resend } from "resend";
import { env } from "@/env.js";

/**
 * Busca o corpo (text + html) de um email inbound via API do Resend.
 *
 * **Por quê**: o webhook do Resend Inbound entrega só metadata (from, to,
 * subject, message_id, attachments) — `text` e `html` **não** vêm no
 * payload. O `email_id` no payload é o ponteiro pra buscar o conteúdo
 * completo via `GET /emails/{id}`.
 *
 * Resend SDK expõe `resend.emails.get(id)` que cobre o caso. O endpoint
 * é unificado entre outbound (emails que enviamos) e inbound (emails
 * recebidos via Resend Inbound) — o `email_id` é UUID em ambos os
 * espaços.
 *
 * Falha (rede, 404, key inválida) é tratada como "corpo vazio". Caller
 * deve aceitar isso e persistir a mensagem com texto vazio — UI do
 * Kintal mostra "(corpo vazio)" pra staff debugar manualmente.
 */
export async function fetchInboundEmailBody(emailId: string): Promise<{
  text: string;
  html: string | null;
}> {
  if (!env.RESEND_API_KEY) {
    return { text: "", html: null };
  }
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await resend.emails.get(emailId);
    if (result.error || !result.data) {
      console.warn(
        "[tickets] fetch inbound body falhou:",
        emailId,
        result.error?.message ?? "sem dados",
      );
      return { text: "", html: null };
    }
    return {
      text: result.data.text ?? "",
      html: result.data.html ?? null,
    };
  } catch (err) {
    console.error("[tickets] fetch inbound body erro inesperado:", emailId, err);
    return { text: "", html: null };
  }
}
