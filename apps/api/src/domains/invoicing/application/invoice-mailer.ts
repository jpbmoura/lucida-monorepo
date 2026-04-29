/**
 * Interface de envio de emails do invoicing. Hoje só tem um caso —
 * "nota fiscal emitida" com PDF em anexo. Mantém os use cases agnósticos
 * de SMTP/Nodemailer; impl fica em infrastructure.
 */
export interface InvoiceMailer {
  sendInvoiceIssued(input: SendInvoiceIssuedInput): Promise<void>;
}

export interface SendInvoiceIssuedInput {
  to: string;
  /** Nome do tomador (PF: name; PJ: legalName). Pra personalizar saudação. */
  takerName: string;
  /** URL pública do PDF — anexo é fetchado a partir dela. */
  pdfUrl: string;
  /** URL do XML — vai como link no corpo do email (sem anexo). */
  xmlUrl: string;
  /**
   * Número/série RPS — quando ausente (caso raro de emissão fora-padrão),
   * o email usa o `providerInvoiceId` como referência.
   */
  rpsNumber: string | null;
  rpsSeries: string | null;
  /** Fallback de identificação quando rps não vem. */
  providerInvoiceId: string;
  /** Valor da nota (centavos). */
  amountCents: number;
  /** Data de emissão (preferencialmente `issuedAt` da Invoice). */
  issuedAt: Date;
}
