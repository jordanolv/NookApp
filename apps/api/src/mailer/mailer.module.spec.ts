import type { ConfigService } from '@nestjs/config';
import { makeDriverFactory } from './mailer.factory';
import { MailpitDriver } from './drivers/mailpit.driver';
import { ResendDriver } from './drivers/resend.driver';

function configStub(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

describe('makeDriverFactory', () => {
  it('defaults to MailpitDriver', () => {
    expect(makeDriverFactory(configStub({}))).toBeInstanceOf(MailpitDriver);
  });

  it('builds ResendDriver when MAIL_DRIVER=resend with api key', () => {
    expect(
      makeDriverFactory(configStub({ MAIL_DRIVER: 'resend', RESEND_API_KEY: 'rk_test' })),
    ).toBeInstanceOf(ResendDriver);
  });

  it('throws when MAIL_DRIVER=resend without api key', () => {
    expect(() => makeDriverFactory(configStub({ MAIL_DRIVER: 'resend' }))).toThrow(
      /RESEND_API_KEY/,
    );
  });

  it('throws on unknown driver', () => {
    expect(() => makeDriverFactory(configStub({ MAIL_DRIVER: 'sendgrid' }))).toThrow(
      /Unknown MAIL_DRIVER/,
    );
  });
});
