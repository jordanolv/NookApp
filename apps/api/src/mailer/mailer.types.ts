export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailerDriver {
  send(input: SendMailInput): Promise<void>;
}

export const MAILER_DRIVER = Symbol('MAILER_DRIVER');
