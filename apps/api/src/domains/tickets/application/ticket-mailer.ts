/**
 * Port pra envio de emails do ticketing. Abstrai do Resend pra deixar
 * o use case agnóstico. Implementação em `infrastructure/resend-ticket-mailer.ts`.
 *
 * Toda chamada precisa retornar o `providerMessageId` que sairá da rede
 * (pra guardar na TicketMessage e correlacionar com In-Reply-To do
 * cliente). Resend devolve um UUID por email enviado.
 */
export interface TicketMailer {
  /**
   * Envia resposta do staff ao cliente. Setta Message-ID, Reply-To
   * com plus-addressing, In-Reply-To/References pra threading do
   * cliente de email.
   */
  sendReply(input: SendReplyInput): Promise<{ providerMessageId: string }>;

  /**
   * Auto-resposta enviada quando ticket é criado de email do cliente.
   * Bloco curto avisando que recebemos. Mesma lógica de threading do
   * reply — cliente que responder esse email cai no mesmo ticket.
   */
  sendAutoResponder(input: SendAutoResponderInput): Promise<{
    providerMessageId: string;
  }>;
}

export interface SendReplyInput {
  ticketId: string;
  /** UUID local da mensagem — vira parte do Message-ID. */
  messageId: string;
  /** Email do cliente. */
  toEmail: string;
  /** "Re: <assunto original>" já formatado. */
  subject: string;
  /** Texto puro escrito pelo staff. */
  bodyText: string;
  /** Message-ID da última mensagem do cliente, se houver — vai pro In-Reply-To. */
  inReplyTo?: string | null;
}

export interface SendAutoResponderInput {
  ticketId: string;
  messageId: string;
  toEmail: string;
  customerName: string | null;
  /** Subject vindo da auto-template. */
  subject: string;
  /** Message-ID inicial do cliente — pra threadear o auto-reply. */
  inReplyTo?: string | null;
}
