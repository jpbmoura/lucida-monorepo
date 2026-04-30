import { env } from "@/env.js";
import { sendEmail } from "@/domains/iam/infrastructure/better-auth/send-email.js";
import type {
  SendAutoResponderInput,
  SendReplyInput,
  TicketMailer,
} from "../application/ticket-mailer.js";
import {
  ticketAutoResponderTemplate,
  ticketReplyTemplate,
} from "./ticket-email-templates.js";
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
 * default. Permite display name diferente ("Lucida Suporte") sem mudar
 * o sender padrão das outras features.
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

  async sendAutoResponder(
    input: SendAutoResponderInput,
  ): Promise<{ providerMessageId: string }> {
    const fromParts = parseEmailAddress(this.fromEmail);
    if (!fromParts) {
      throw new Error(`TICKETS_FROM_EMAIL inválido: ${this.fromEmail}`);
    }
    const messageIdHeader = buildOutboundMessageId(
      input.ticketId,
      input.messageId,
      fromParts.domain,
    );
    const replyTo = buildReplyTo(input.ticketId, this.fromEmail);
    const template = ticketAutoResponderTemplate({
      customerName: input.customerName,
    });

    const headers: Record<string, string> = {
      "Message-ID": messageIdHeader,
      // Auto-Submitted: avisa receivers que é resposta automática.
      // Filtros de spam tratam melhor (não bumpa reputação).
      "Auto-Submitted": "auto-replied",
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
}

/**
 * Stub usado quando TICKETS_FROM_EMAIL não está configurado. Caller
 * que tentar enviar recebe erro — webhook handler engole e segue
 * (best-effort), igual padrão de outras features.
 */
export class UnavailableTicketMailer implements TicketMailer {
  async sendReply(): Promise<never> {
    throw new Error(
      "Tickets não configurado. Defina TICKETS_FROM_EMAIL pra habilitar.",
    );
  }
  async sendAutoResponder(): Promise<never> {
    throw new Error(
      "Tickets não configurado. Defina TICKETS_FROM_EMAIL pra habilitar.",
    );
  }
}

export function isTicketsConfigured(): boolean {
  return Boolean(env.TICKETS_FROM_EMAIL);
}
