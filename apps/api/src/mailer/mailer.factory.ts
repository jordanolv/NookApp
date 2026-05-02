import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailpitDriver } from './drivers/mailpit.driver';
import { ResendDriver } from './drivers/resend.driver';
import type { MailerDriver } from './mailer.types';

export function makeDriverFactory(config: ConfigService): MailerDriver {
  const logger = new Logger('MailerModule');
  const driver = config.get<string>('MAIL_DRIVER', 'mailpit');
  const from = config.get<string>('MAIL_FROM', 'NookApp <noreply@nookapp.local>');

  if (driver === 'resend') {
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY is required when MAIL_DRIVER=resend');
    logger.log('using Resend driver');
    return new ResendDriver({ apiKey, from });
  }

  if (driver === 'mailpit') {
    const host = config.get<string>('MAILPIT_HOST', 'localhost');
    const port = Number(config.get<string>('MAILPIT_PORT', '1025'));
    logger.log(`using Mailpit driver (${host}:${port})`);
    return new MailpitDriver({ host, port, from });
  }

  throw new Error(`Unknown MAIL_DRIVER: "${driver}" (expected "mailpit" or "resend")`);
}
