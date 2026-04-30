import nodemailer from "nodemailer";
import { env } from "@/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /**
   * Anexos. Hoje só usado pra enviar o PDF da NFS-e junto do email
   * "nota emitida". `nodemailer` aceita Buffer + filename direto.
   */
  attachments?: EmailAttachment[];
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: SendEmailInput): Promise<void> {
  // Logging temporário pra debug de entrega em prod. nodemailer info traz
  // accepted/rejected/response (resposta SMTP crua tipo "250 2.0.0 OK"),
  // o que dá pra distinguir 3 cenários:
  //   - exception            → não conectou no SMTP (timeout, auth, TLS)
  //   - rejected populado    → SMTP rejeitou o destinatário
  //   - accepted + 250       → SMTP aceitou; problema é entrega downstream
  //                            (SPF/DKIM/blacklist/spam)
  // Remover quando entrega estabilizar.
  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
      attachments,
    });
    console.log("[email] sent", {
      to,
      subject,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (err) {
    const e = err as { message?: string; code?: string; command?: string };
    console.error("[email] FAILED", {
      to,
      subject,
      message: e.message,
      code: e.code,
      command: e.command,
    });
    throw err;
  }
}
