import { Inject, Injectable } from '@nestjs/common';
import { MAILER_DRIVER, type MailerDriver, type SendMailInput } from './mailer.types';
import { renderVerifyEmail, type VerifyEmailParams } from './templates/verify-email.template';

@Injectable()
export class MailerService {
  constructor(@Inject(MAILER_DRIVER) private readonly driver: MailerDriver) {}

  send(input: SendMailInput): Promise<void> {
    return this.driver.send(input);
  }

  sendVerificationEmail(to: string, params: VerifyEmailParams): Promise<void> {
    const { subject, html, text } = renderVerifyEmail(params);
    return this.driver.send({ to, subject, html, text });
  }
}
