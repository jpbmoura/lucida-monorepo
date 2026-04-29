import { env } from "@/env.js";

/**
 * Template de email "Nota fiscal emitida". Mesmo estilo HTML minimalista
 * dos templates do billing — copy em pt-BR, sem branding pesado.
 */

export interface InvoiceIssuedTemplateInput {
  takerName: string;
  rpsLabel: string; // ex: "RPS A 1234" ou "ID NFE-IO {uuid}"
  amount: string; // já formatado em BRL
  issuedAt: string; // já formatado pt-BR
  xmlUrl: string;
}

export function invoiceIssuedTemplate(input: InvoiceIssuedTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = input.takerName ? `Olá, ${input.takerName}` : "Olá";
  const billingUrl = `${env.WEB_ORIGIN}/app/billing`;

  const subject = "Sua nota fiscal foi emitida";

  const html = baseTemplate({
    title: "Nota fiscal emitida",
    preheader: `${input.rpsLabel} emitida em ${input.issuedAt}`,
    body: `
      <p>${greeting},</p>
      <p>Sua nota fiscal de serviço foi <strong>autorizada pela prefeitura</strong>. O PDF está anexado neste email.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; border-collapse: collapse; border: 1px solid #e8e8e8; border-radius: 12px; overflow: hidden;">
        <tr><td style="padding: 12px 16px; background: #fafafa; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Detalhes</td></tr>
        <tr><td style="padding: 12px 16px;">${input.rpsLabel}</td></tr>
        <tr><td style="padding: 12px 16px; border-top: 1px solid #f4f4f4;">Valor: <strong>${input.amount}</strong></td></tr>
        <tr><td style="padding: 12px 16px; border-top: 1px solid #f4f4f4;">Emitida em: <strong>${input.issuedAt}</strong></td></tr>
      </table>
      <p style="margin-top: 24px;">
        <a href="${billingUrl}" style="display: inline-block; background: #0a0a0a; color: #ffffff; padding: 10px 18px; border-radius: 10px; text-decoration: none; font-weight: 500;">Ver no painel</a>
        <a href="${input.xmlUrl}" style="margin-left: 8px; color: #737373; font-size: 13px;">Baixar XML</a>
      </p>
      <p style="margin-top: 24px; color: #737373; font-size: 13px;">Qualquer dúvida fiscal, é só responder esse email.</p>
    `,
  });

  const text = [
    `${greeting},`,
    "",
    "Sua nota fiscal de serviço foi autorizada pela prefeitura. PDF anexado.",
    "",
    `${input.rpsLabel}`,
    `Valor: ${input.amount}`,
    `Emitida em: ${input.issuedAt}`,
    "",
    `Painel: ${billingUrl}`,
    `XML: ${input.xmlUrl}`,
  ].join("\n");

  return { subject, html, text };
}

function baseTemplate({
  title,
  preheader,
  body,
}: {
  title: string;
  preheader: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <span style="display: none; opacity: 0; visibility: hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f5; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; padding: 32px; max-width: 560px;">
            <tr>
              <td style="font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 0.12em; padding-bottom: 16px;">Lucida</td>
            </tr>
            <tr>
              <td style="font-size: 22px; font-weight: 500; color: #0a0a0a; padding-bottom: 16px;">${title}</td>
            </tr>
            <tr>
              <td style="font-size: 14px; line-height: 1.6; color: #404040;">${body}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
