import { Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type { MailerDriver, SendMailInput } from '../mailer.types';

export interface MailpitDriverOptions {
  host: string;
  port: number;
  from: string;
}

export class MailpitDriver implements MailerDriver {
  private readonly logger = new Logger(MailpitDriver.name);
  private readonly transport: Transporter;

  constructor(private readonly opts: MailpitDriverOptions) {
    this.transport = createTransport({
      host: opts.host,
      port: opts.port,
      secure: false,
      ignoreTLS: true,
    });
  }

  async send(input: SendMailInput): Promise<void> {
    await this.transport.sendMail({
      from: this.opts.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    this.logger.log(`mail "${input.subject}" → ${input.to} (mailpit)`);
  }
}
