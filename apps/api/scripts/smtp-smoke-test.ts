/**
 * Smoke test SMTP — testa conexão + envio sem envolver o resto da app.
 *
 * Uso (local):
 *   pnpm --filter @lucida/api exec tsx scripts/smtp-smoke-test.ts seu-email@gmail.com
 *
 * Uso (Railway shell):
 *   railway run -- pnpm --filter @lucida/api exec tsx scripts/smtp-smoke-test.ts seu-email@gmail.com
 *
 * O script faz 3 coisas:
 *   1. transporter.verify() — testa só conexão + auth (sem enviar)
 *   2. sendMail() — manda 1 email de teste pro destinatário do arg
 *   3. loga o `info` retornado: accepted/rejected/response/messageId
 *
 * Interpretação:
 *   - "verify falhou" → não conectou (timeout/auth/TLS). Nem chega a tentar
 *     enviar. Diagnóstico: rede ou credencial.
 *   - "verify OK, sendMail accepted=[email], response 250" → SMTP aceitou.
 *     Se mesmo assim não chegou na caixa do destinatário, problema é
 *     downstream (SPF/DKIM/spam/blacklist).
 *   - "rejected" populado → SMTP rejeitou. Geralmente trash mailbox ou
 *     política de envio.
 */

import "dotenv/config";
import nodemailer from "nodemailer";

const to = process.argv[2];
if (!to) {
  console.error(
    "Uso: tsx scripts/smtp-smoke-test.ts <email-de-destino>",
  );
  process.exit(1);
}

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM;

if (!host || !user || !pass || !from) {
  console.error("Faltam envs: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM");
  process.exit(1);
}

console.log("Config:", {
  host,
  port,
  user,
  from,
  pass: `${pass.slice(0, 2)}***${pass.slice(-2)}`,
  secure: port === 465,
});

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  // Logs verbose do nodemailer — mostra handshake TLS, comandos SMTP, tudo.
  logger: true,
  debug: true,
});

async function run() {
  console.log("\n[1/2] Testando conexão + auth (transporter.verify)...");
  try {
    await transporter.verify();
    console.log("✓ verify OK — conectou e autenticou.");
  } catch (err) {
    console.error("✗ verify FALHOU:", err);
    console.error(
      "\nNão dá pra continuar. Erros comuns:",
      "\n  - 'connect ETIMEDOUT' → rede bloqueada (firewall/cloud egress)",
      "\n  - 'Invalid login' → senha errada ou conta suspensa",
      "\n  - 'wrong version number' → secure=true em porta não-SSL ou vice-versa",
    );
    process.exit(2);
  }

  console.log(`\n[2/2] Enviando email de teste pra ${to}...`);
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: "SMTP smoke test · Lucida",
      text: `Se você está lendo isso, o SMTP funcionou.\nHora: ${new Date().toISOString()}`,
      html: `<p>Se você está lendo isso, o SMTP funcionou.</p><p>Hora: ${new Date().toISOString()}</p>`,
    });
    console.log("✓ sendMail completou.");
    console.log("Resultado:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    if (info.rejected.length > 0) {
      console.error(
        "\n⚠ SMTP REJEITOU o destinatário — nem tentou entregar.",
      );
      process.exit(3);
    }
    console.log(
      "\n✓ SMTP aceitou. Se o email não chegar na caixa do destinatário",
      "(nem em spam) em 2-5 min, problema é downstream:",
      "\n  - SPF/DKIM/DMARC ausentes pro domínio",
      "\n  - IP de origem em blacklist",
      "\n  - Receiver bouncing após aceitar (raro)",
    );
  } catch (err) {
    console.error("✗ sendMail FALHOU:", err);
    process.exit(4);
  }
}

run().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(99);
});
