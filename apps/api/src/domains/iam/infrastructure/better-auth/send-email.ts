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
   * Override do `from` padrão (env.EMAIL_FROM). Útil quando uma feature
   * tem display name específico. Domínio precisa estar verificado no
   * Resend igual o default.
   */
  from?: string;
  /**
   * Reply-To. Tickets usam plus-addressing (`contato+t_{id}@...`) pra
   * threadar respostas do cliente de volta no ticket certo.
   */
  replyTo?: string;
  /**
   * Headers RFC 5322 customizados. Tickets passam Message-ID,
   * In-Reply-To e References pra threading no cliente de email.
   */
  headers?: Record<string, string>;
  /**
   * Anexos. Hoje usado pra PDF da NFS-e e (futuro) anexos de tickets.
   * Resend SDK aceita Buffer direto.
   */
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  /** ID do Resend — útil pra guardar como providerMessageId em tickets. */
  resendId: string;
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
  from,
  replyTo,
  headers,
  attachments,
}: SendEmailInput): Promise<SendEmailResult> {
  const result = await resend.emails.send({
    from: from ?? env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
    headers,
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

  return { resendId: result.data?.id ?? "" };
}
