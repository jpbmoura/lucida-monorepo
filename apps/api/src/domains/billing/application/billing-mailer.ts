/**
 * Interface de envio de emails pro billing. Mantém os use cases agnósticos
 * de SMTP/Nodemailer — a impl fica em infra.
 */
export interface BillingMailer {
  sendTopupReceipt(input: {
    to: string;
    customerName: string | null;
    creditsGranted: number;
    amountCents: number;
    receiptUrl: string | null;
    expiresAt: Date;
  }): Promise<void>;

  sendPaymentFailed(input: {
    to: string;
    customerName: string | null;
    planName: string | null;
    portalUrl: string | null;
  }): Promise<void>;
}
