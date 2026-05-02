import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { MailerDriver, SendMailInput } from '../mailer.types';

export interface ResendDriverOptions {
  apiKey: string;
  from: string;
}

export class ResendDriver implements MailerDriver {
  private readonly logger = new Logger(ResendDriver.name);
  private readonly client: Resend;

  constructor(private readonly opts: ResendDriverOptions) {
    this.client = new Resend(opts.apiKey);
  }

  async send(input: SendMailInput): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.opts.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
    this.logger.log(`mail "${input.subject}" → ${input.to} (resend)`);
  }
}
