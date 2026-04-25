import type { BillingMailer } from "../application/billing-mailer.js";
import { sendEmail } from "@/domains/iam/infrastructure/better-auth/send-email.js";
import {
  paymentFailedTemplate,
  topupReceiptTemplate,
} from "./email-templates.js";

/**
 * Impl SMTP via o helper compartilhado do IAM. Não reusa BetterAuth — só o
 * transport (nodemailer) que já está configurado.
 */
export class SmtpBillingMailer implements BillingMailer {
  async sendTopupReceipt(input: {
    to: string;
    customerName: string | null;
    creditsGranted: number;
    amountCents: number;
    receiptUrl: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const template = topupReceiptTemplate({
      customerName: input.customerName,
      creditsGranted: input.creditsGranted,
      amountCents: input.amountCents,
      currency: "BRL",
      receiptUrl: input.receiptUrl,
      expiresAt: input.expiresAt,
    });
    await sendEmail({ to: input.to, ...template });
  }

  async sendPaymentFailed(input: {
    to: string;
    customerName: string | null;
    planName: string | null;
    portalUrl: string | null;
  }): Promise<void> {
    const template = paymentFailedTemplate({
      customerName: input.customerName,
      planName: input.planName,
      portalUrl: input.portalUrl,
    });
    await sendEmail({ to: input.to, ...template });
  }
}
