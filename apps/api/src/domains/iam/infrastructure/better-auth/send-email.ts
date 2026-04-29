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
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
    attachments,
  });
}
