import { env } from "@/env.js";

/**
 * Templates de email do ticketing. Estilo HTML enxuto pra entrega
 * confiável (clientes de email rejeitam HTML pesado). Texto alternativo
 * sempre presente — Outlook etc usam ele às vezes.
 *
 * Footer padrão: `— Equipe Lucida · lucidaexam.com`
 */

export interface ReplyTemplateInput {
  /** Texto puro escrito pelo staff. Quebras de linha viram <br>. */
  bodyText: string;
}

export function ticketReplyTemplate(input: ReplyTemplateInput): {
  html: string;
  text: string;
} {
  const escaped = escapeHtml(input.bodyText);
  const htmlBody = escaped.replace(/\n/g, "<br>");
  const html = wrap(htmlBody);
  const text = `${input.bodyText}\n\n${footerText()}`;
  return { html, text };
}

// ─── Internals ────────────────────────────────────────────────────────

function wrap(body: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e8e8e8;">
    <tr><td style="padding:32px;">
      <div style="font-size:14px;font-weight:600;color:#007AFF;letter-spacing:-0.02em;margin-bottom:24px;">Lucida</div>
      <div style="font-size:14px;line-height:1.6;color:#1f1f1f;">
        ${body}
      </div>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f0f0f0;font-size:12px;color:#737373;">
        — Equipe Lucida · <a href="${escapeHtml(env.WEB_ORIGIN)}" style="color:#737373;text-decoration:underline;">lucidaexam.com</a>
      </div>
    </td></tr>
  </table>
</body></html>`;
}

function footerText(): string {
  return "— Equipe Lucida · lucidaexam.com";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
