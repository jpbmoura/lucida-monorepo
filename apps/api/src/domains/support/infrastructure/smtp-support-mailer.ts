import { env } from "@/env.js";
import { sendEmail } from "@/domains/iam/infrastructure/better-auth/send-email.js";
import type {
  ContactMessageInput,
  SupportMailer,
} from "../application/support-mailer.js";

const CATEGORY_LABEL: Record<string, string> = {
  duvida: "Dúvida de uso",
  problema: "Problema técnico",
  sugestao: "Sugestão",
  billing: "Billing / pagamento",
  outro: "Outro",
  duvida_admin: "[Instituição] Dúvida de administração",
  billing_institucional: "[Instituição] Billing / créditos",
  gestao_professores: "[Instituição] Gestão de professores",
};

export class SmtpSupportMailer implements SupportMailer {
  async sendContactMessage(input: ContactMessageInput): Promise<void> {
    const categoryLabel = CATEGORY_LABEL[input.category] ?? input.category;
    const subject = `[Lucida Suporte] ${categoryLabel} — ${input.subject}`;
    const html = renderHtml(input, categoryLabel);
    const text = renderText(input, categoryLabel);

    await sendEmail({
      to: env.SUPPORT_EMAIL,
      subject,
      html,
      text,
    });
  }
}

function renderHtml(input: ContactMessageInput, categoryLabel: string): string {
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br>");
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; color: #0a0a0a;">
      <h2 style="margin: 0 0 4px; font-size: 18px;">Nova mensagem de suporte</h2>
      <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px;">
        Categoria: <strong>${escapeHtml(categoryLabel)}</strong>
      </p>

      <h3 style="margin: 0 0 8px; font-size: 15px;">${escapeHtml(input.subject)}</h3>
      <div style="border-left: 3px solid #007AFF; padding-left: 12px; margin: 8px 0 24px; font-size: 14px; line-height: 1.5;">
        ${safeMessage}
      </div>

      <table style="font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Nome</td><td>${escapeHtml(input.user.name || "—")}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Email</td><td><a href="mailto:${escapeHtml(input.user.email)}">${escapeHtml(input.user.email)}</a></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">User ID</td><td><code>${escapeHtml(input.user.id)}</code></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Quando</td><td>${escapeHtml(input.metadata.timestamp)}</td></tr>
        ${input.metadata.userAgent ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Browser</td><td style="font-size: 12px;">${escapeHtml(input.metadata.userAgent)}</td></tr>` : ""}
        ${input.metadata.referer ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Origem</td><td>${escapeHtml(input.metadata.referer)}</td></tr>` : ""}
      </table>

      <p style="margin-top: 24px; color: #9ca3af; font-size: 11px;">
        Mensagem enviada pelo formulário de suporte. Veja "Origem" acima pra
        o contexto (app de professor ou painel de instituição). Responda
        diretamente pelo email acima.
      </p>
    </div>
  `;
}

function renderText(input: ContactMessageInput, categoryLabel: string): string {
  return [
    `Nova mensagem de suporte`,
    `Categoria: ${categoryLabel}`,
    ``,
    `Assunto: ${input.subject}`,
    ``,
    input.message,
    ``,
    `---`,
    `Nome: ${input.user.name || "—"}`,
    `Email: ${input.user.email}`,
    `User ID: ${input.user.id}`,
    `Quando: ${input.metadata.timestamp}`,
    input.metadata.userAgent ? `Browser: ${input.metadata.userAgent}` : "",
    input.metadata.referer ? `Origem: ${input.metadata.referer}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
