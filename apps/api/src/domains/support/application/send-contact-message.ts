import type { ContactMessageInput, SupportMailer } from "./support-mailer.js";

export class SendContactMessageUseCase {
  constructor(private readonly mailer: SupportMailer) {}

  async execute(input: ContactMessageInput): Promise<void> {
    await this.mailer.sendContactMessage(input);
  }
}
