import { env } from "@/env.js";
import { sendEmail } from "@/domains/iam/infrastructure/better-auth/send-email.js";
import type {
  SendNewInput,
  SendReplyInput,
  TicketMailer,
} from "../application/ticket-mailer.js";
import { ticketReplyTemplate } from "./ticket-email-templates.js";
import {
  buildOutboundMessageId,
  buildReplyTo,
  parseEmailAddress,
} from "./threading.js";

/**
 * Impl Resend do TicketMailer. Reutiliza o helper `sendEmail` do IAM
 * (que já tem logging + auth). Headers customizados (Message-ID,
 * In-Reply-To, References) são passados via `headers` — Resend repassa
 * pro cliente de email tal qual.
 *
 * `from` override pra usar `TICKETS_FROM_EMAIL` no lugar do `EMAIL_FROM`
 * default. Permite display name diferente sem mudar o sender padrão das
 * outras features.
 */
export class ResendTicketMailer implements TicketMailer {
  /**
   * @param fromEmail Endereço completo no formato "Name <email@domain>".
   *                  Vem de `env.TICKETS_FROM_EMAIL`.
   */
  constructor(private readonly fromEmail: string) {}

  async sendReply(
    input: SendReplyInput,
  ): Promise<{ providerMessageId: string }> {
    const fromParts = parseEmailAddress(this.fromEmail);
    if (!fromParts) {
      throw new Error(
        `TICKETS_FROM_EMAIL inválido: ${this.fromEmail}`,
      );
    }
    const messageIdHeader = buildOutboundMessageId(
      input.ticketId,
      input.messageId,
      fromParts.domain,
    );
    const replyTo = buildReplyTo(input.ticketId, this.fromEmail);
    const template = ticketReplyTemplate({ bodyText: input.bodyText });

    // References + In-Reply-To pra threading. Cliente de email usa pra
    // visualizar como mesma conversa.
    const headers: Record<string, string> = {
      "Message-ID": messageIdHeader,
    };
    if (input.inReplyTo) {
      headers["In-Reply-To"] = input.inReplyTo;
      headers.References = input.inReplyTo;
    }

    const result = await sendEmail({
      from: this.fromEmail,
      to: input.toEmail,
      subject: input.subject,
      html: template.html,
      text: template.text,
      replyTo: replyTo ?? undefined,
      headers,
    });

    return { providerMessageId: result.resendId };
  }

  async sendNew(
    input: SendNewInput,
  ): Promise<{ providerMessageId: string }> {
    const fromParts = parseEmailAddress(this.fromEmail);
    if (!fromParts) {
      throw new Error(
        `TICKETS_FROM_EMAIL inválido: ${this.fromEmail}`,
      );
    }
    const messageIdHeader = buildOutboundMessageId(
      input.ticketId,
      input.messageId,
      fromParts.domain,
    );
    const replyTo = buildReplyTo(input.ticketId, this.fromEmail);
    const template = ticketReplyTemplate({ bodyText: input.bodyText });

    // Sem In-Reply-To/References — é início de conversa. O Message-ID
    // permite que o cliente, ao responder, mande In-Reply-To apontando
    // pra ele e a gente correlacione via findByOutboundMessageId.
    const headers: Record<string, string> = {
      "Message-ID": messageIdHeader,
    };

    const result = await sendEmail({
      from: this.fromEmail,
      to: input.toEmail,
      subject: input.subject,
      html: template.html,
      text: template.text,
      replyTo: replyTo ?? undefined,
      headers,
    });

    return { providerMessageId: result.resendId };
  }
}

/**
 * Stub usado quando TICKETS_FROM_EMAIL não está configurado. Caller
 * que tentar enviar recebe erro — feature de tickets fica off mas
 * webhook de inbound continua aceitando emails (só não responde).
 */
export class UnavailableTicketMailer implements TicketMailer {
  async sendReply(): Promise<never> {
    throw new Error(
      "Tickets não configurado. Defina TICKETS_FROM_EMAIL pra habilitar.",
    );
  }
  async sendNew(): Promise<never> {
    throw new Error(
      "Tickets não configurado. Defina TICKETS_FROM_EMAIL pra habilitar.",
    );
  }
}

export function isTicketsConfigured(): boolean {
  return Boolean(env.TICKETS_FROM_EMAIL);
}
