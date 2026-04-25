import { env } from "@/env.js";

/**
 * Templates de email transacionais do billing. HTML minimalista — copy em
 * pt-BR, sem branding pesado. Estrutura inspirada nos templates do IAM.
 */

interface TopupReceiptInput {
  customerName: string | null;
  creditsGranted: number;
  amountCents: number;
  currency: "BRL";
  receiptUrl: string | null;
  expiresAt: Date;
}

export function topupReceiptTemplate(input: TopupReceiptInput): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = input.customerName ? `Olá, ${input.customerName}` : "Olá";
  const amount = formatBRL(input.amountCents);
  const credits = input.creditsGranted.toLocaleString("pt-BR");
  const expiresAt = input.expiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const billingUrl = `${env.WEB_ORIGIN}/app/billing`;

  const subject = `Seus ${credits} créditos chegaram 🎉`;

  const html = baseTemplate({
    title: "Recibo de compra",
    preheader: `Crédito de ${credits} créditos confirmado.`,
    body: `
      <p>${greeting},</p>
      <p>Confirmamos sua compra na Lucida. <strong>${credits} créditos</strong> já estão disponíveis na sua carteira.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; border-collapse: collapse; border: 1px solid #e8e8e8; border-radius: 12px; overflow: hidden;">
        <tr><td style="padding: 12px 16px; background: #fafafa; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Detalhes</td></tr>
        <tr><td style="padding: 12px 16px;">Créditos: <strong>${credits}</strong></td></tr>
        <tr><td style="padding: 12px 16px; border-top: 1px solid #f4f4f4;">Valor: <strong>${amount}</strong></td></tr>
        <tr><td style="padding: 12px 16px; border-top: 1px solid #f4f4f4;">Válidos até: <strong>${expiresAt}</strong></td></tr>
      </table>
      <p>Esses créditos são consumidos depois dos da sua assinatura (se houver).</p>
      <p style="margin-top: 24px;">
        <a href="${billingUrl}" style="display: inline-block; background: #0a0a0a; color: #ffffff; padding: 10px 18px; border-radius: 10px; text-decoration: none; font-weight: 500;">Ver saldo</a>
        ${input.receiptUrl
          ? `<a href="${input.receiptUrl}" style="margin-left: 8px; color: #737373; font-size: 13px;">Nota do Stripe</a>`
          : ""}
      </p>
      <p style="margin-top: 24px; color: #737373; font-size: 13px;">Qualquer dúvida, é só responder esse email.</p>
    `,
  });

  const text = [
    `${greeting},`,
    "",
    `Confirmamos sua compra na Lucida. ${credits} créditos já estão disponíveis.`,
    "",
    `Valor: ${amount}`,
    `Válidos até: ${expiresAt}`,
    "",
    `Ver saldo: ${billingUrl}`,
    input.receiptUrl ? `Nota do Stripe: ${input.receiptUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

interface PaymentFailedInput {
  customerName: string | null;
  planName: string | null;
  /** URL do Customer Portal — abre cenário de atualização de cartão. */
  portalUrl: string | null;
}

export function paymentFailedTemplate(input: PaymentFailedInput): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = input.customerName ? `Olá, ${input.customerName}` : "Olá";
  const planLine = input.planName
    ? ` da sua assinatura do plano ${input.planName}`
    : " da sua assinatura";
  const billingUrl = `${env.WEB_ORIGIN}/app/billing`;

  const subject = "Falha ao processar seu pagamento";

  const html = baseTemplate({
    title: "Problema com o pagamento",
    preheader: "Atualize seu método de pagamento pra não perder acesso.",
    body: `
      <p>${greeting},</p>
      <p>Tivemos um problema ao processar o pagamento${planLine}. Isso pode ter acontecido por cartão vencido, saldo insuficiente ou um bloqueio preventivo do banco.</p>
      <p><strong>Seu acesso continua ativo por enquanto</strong> — o Stripe tenta novamente automaticamente algumas vezes.</p>
      <p>Pra resolver agora, acesse o portal de pagamento e atualize seu cartão:</p>
      <p style="margin: 20px 0;">
        <a href="${input.portalUrl ?? billingUrl}" style="display: inline-block; background: #0a0a0a; color: #ffffff; padding: 10px 18px; border-radius: 10px; text-decoration: none; font-weight: 500;">
          Atualizar forma de pagamento
        </a>
      </p>
      <p style="color: #737373; font-size: 13px;">Se você já atualizou, pode ignorar este aviso.</p>
    `,
  });

  const text = [
    `${greeting},`,
    "",
    `Tivemos um problema ao processar o pagamento${planLine}.`,
    "Seu acesso continua ativo — o Stripe retenta automaticamente.",
    "",
    `Atualize seu cartão: ${input.portalUrl ?? billingUrl}`,
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
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:#fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0a0a0a;">
<span style="display:none;font-size:1px;color:#fafafa;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa; padding:40px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #f4f4f4;">
      <tr><td style="padding:28px 32px 8px 32px;">
        <div style="font-size:13px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase; color:#a3a3a3;">Lucida</div>
        <h1 style="margin:12px 0 0 0; font-size:22px; font-weight:500; letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
      </td></tr>
      <tr><td style="padding:20px 32px 32px 32px; font-size:15px; line-height:1.55; color:#3f3f3f;">
        ${body}
      </td></tr>
      <tr><td style="padding:16px 32px; border-top:1px solid #f4f4f4; color:#a3a3a3; font-size:12px;">
        Enviado por Lucida · <a href="${env.WEB_ORIGIN}" style="color:#a3a3a3; text-decoration:underline;">${env.WEB_ORIGIN.replace(/^https?:\/\//, "")}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
