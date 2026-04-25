interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function verifyEmailTemplate(url: string): EmailTemplate {
  return {
    subject: "Confirme seu e-mail · Lucida",
    text: `Confirme seu e-mail acessando: ${url}`,
    html: wrap(`
      <h1 style="font-size:22px;margin:0 0 12px;color:#0a0a0a;">Confirme seu e-mail</h1>
      <p style="margin:0 0 20px;color:#525252;">Clique abaixo para ativar sua conta na Lucida.</p>
      ${button("Confirmar e-mail", url)}
      <p style="margin:24px 0 0;font-size:12px;color:#a3a3a3;">Se você não criou essa conta, ignore este e-mail.</p>
    `),
  };
}

export function resetPasswordTemplate(url: string): EmailTemplate {
  return {
    subject: "Redefinir sua senha · Lucida",
    text: `Para redefinir sua senha, acesse: ${url}`,
    html: wrap(`
      <h1 style="font-size:22px;margin:0 0 12px;color:#0a0a0a;">Redefinir senha</h1>
      <p style="margin:0 0 20px;color:#525252;">Recebemos um pedido para redefinir sua senha. Clique abaixo para escolher uma nova. O link expira em 1 hora.</p>
      ${button("Redefinir senha", url)}
      <p style="margin:24px 0 0;font-size:12px;color:#a3a3a3;">Se você não pediu isso, pode ignorar este e-mail.</p>
    `),
  };
}

export function organizationInviteTemplate(orgName: string, url: string): EmailTemplate {
  return {
    subject: `Você foi convidado para ${orgName} · Lucida`,
    text: `Você foi convidado para a instituição ${orgName}. Aceite o convite em: ${url}`,
    html: wrap(`
      <h1 style="font-size:22px;margin:0 0 12px;color:#0a0a0a;">Convite para ${escape(orgName)}</h1>
      <p style="margin:0 0 20px;color:#525252;">Você foi convidado a entrar na instituição <strong>${escape(orgName)}</strong> na Lucida.</p>
      ${button("Aceitar convite", url)}
    `),
  };
}

function wrap(body: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e8e8e8;">
    <tr><td style="padding:32px;">
      <div style="font-size:14px;font-weight:600;color:#007AFF;letter-spacing:-0.02em;margin-bottom:28px;">Lucida</div>
      ${body}
    </td></tr>
  </table>
  <p style="max-width:480px;margin:16px auto 0;font-size:11px;color:#a3a3a3;text-align:center;">© Lucida · lucidaexam.com</p>
</body></html>`;
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:500;text-decoration:none;">${escape(label)}</a>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
