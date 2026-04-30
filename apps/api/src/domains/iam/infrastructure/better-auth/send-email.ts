import { Resend } from "resend";
import { env } from "@/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /**
   * Anexos. Hoje só usado pra enviar o PDF da NFS-e junto do email
   * "nota emitida". Resend SDK aceita Buffer direto.
   */
  attachments?: EmailAttachment[];
}

/**
 * Envia email via Resend (HTTP API, porta 443). Substituiu Hostinger SMTP
 * porque (1) Hostinger tem reputação ruim em IPs de cloud (entrega
 * inconsistente) e (2) cloud providers às vezes bloqueiam egress SMTP —
 * HTTP API é imune a esse problema.
 *
 * `from` (env.EMAIL_FROM) precisa ter o domínio verificado no painel
 * Resend (SPF + DKIM no DNS) — senão a chamada devolve 422.
 *
 * Logging aqui é importante pra debug em prod: cada erro do Resend tem
 * `name`/`message` estruturado (ex: "validation_error", "rate_limit").
 * Sucesso loga `id` (UUID do Resend) — útil pra correlacionar com o
 * dashboard deles.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: SendEmailInput): Promise<void> {
  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  if (result.error) {
    console.error("[email] Resend FAILED", {
      to,
      subject,
      name: result.error.name,
      message: result.error.message,
    });
    throw new Error(`Resend: ${result.error.message}`);
  }

  console.log("[email] sent", {
    to,
    subject,
    resendId: result.data?.id,
  });
}
