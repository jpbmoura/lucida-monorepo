import {
  sendEmail,
  type EmailAttachment,
} from "@/domains/iam/infrastructure/better-auth/send-email.js";
import type {
  InvoiceMailer,
  SendInvoiceIssuedInput,
} from "../application/invoice-mailer.js";
import { invoiceIssuedTemplate } from "./invoice-email-templates.js";

/**
 * Impl SMTP que busca o PDF na URL pública do NFE.io e anexa. URL é
 * pública (sem auth) — o link permanente fica disponível pelo ciclo de
 * vida da nota (NFE.io guarda indefinidamente). Se o fetch falhar,
 * loga + manda email sem anexo (com link no corpo) — melhor entregar
 * algo do que nada.
 *
 * Timeout de 10s no fetch — se o NFE.io tá lento, o webhook handler
 * espera demais e o email não sai. Aceitamos a degradação.
 */
const PDF_FETCH_TIMEOUT_MS = 10_000;

export class SmtpInvoiceMailer implements InvoiceMailer {
  async sendInvoiceIssued(input: SendInvoiceIssuedInput): Promise<void> {
    const rpsLabel =
      input.rpsNumber && input.rpsSeries
        ? `RPS ${input.rpsSeries} ${input.rpsNumber}`
        : `Ref ${input.providerInvoiceId}`;
    const template = invoiceIssuedTemplate({
      takerName: input.takerName,
      rpsLabel,
      amount: formatBRL(input.amountCents),
      issuedAt: input.issuedAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      xmlUrl: input.xmlUrl,
    });

    const attachments = await this.buildAttachments(
      input.pdfUrl,
      input.providerInvoiceId,
    );

    await sendEmail({
      to: input.to,
      ...template,
      attachments,
    });
  }

  private async buildAttachments(
    pdfUrl: string,
    providerInvoiceId: string,
  ): Promise<EmailAttachment[]> {
    try {
      const buf = await fetchPdf(pdfUrl);
      return [
        {
          filename: `nota-fiscal-${providerInvoiceId}.pdf`,
          content: buf,
          contentType: "application/pdf",
        },
      ];
    } catch (err) {
      console.warn(
        "[invoicing] falha ao baixar PDF pra anexar — enviando email sem anexo:",
        pdfUrl,
        (err as Error).message,
      );
      return [];
    }
  }
}

async function fetchPdf(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
