export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export interface EmailProvider {
  readonly key: string;
  sendTransactional(message: EmailMessage): Promise<void>;
}

export class UnconfiguredEmailProvider implements EmailProvider {
  readonly key = "unconfigured";

  async sendTransactional(): Promise<void> {
    throw new Error("No email provider is connected for this organization.");
  }
}
