export interface ContactMessageInput {
  category: string;
  subject: string;
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  metadata: {
    userAgent: string | null;
    timestamp: string;
    referer: string | null;
    ipHash: string | null;
  };
}

export interface SupportMailer {
  sendContactMessage(input: ContactMessageInput): Promise<void>;
}
