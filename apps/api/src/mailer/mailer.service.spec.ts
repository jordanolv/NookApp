import { Test } from '@nestjs/testing';
import { MailerService } from './mailer.service';
import { MAILER_DRIVER, type MailerDriver } from './mailer.types';

describe('MailerService', () => {
  function build(driver: MailerDriver) {
    return Test.createTestingModule({
      providers: [MailerService, { provide: MAILER_DRIVER, useValue: driver }],
    }).compile();
  }

  it('forwards send() to the configured driver', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await build({ send });
    const service = moduleRef.get(MailerService);

    await service.send({ to: 'a@b.c', subject: 's', html: '<p>x</p>', text: 'x' });

    expect(send).toHaveBeenCalledWith({ to: 'a@b.c', subject: 's', html: '<p>x</p>', text: 'x' });
  });

  it('renders + sends verification email', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await build({ send });
    const service = moduleRef.get(MailerService);

    await service.sendVerificationEmail('jordan@nookapp.local', {
      name: 'Jordan',
      verifyUrl: 'https://example.com/verify?t=abc',
    });

    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe('jordan@nookapp.local');
    expect(arg.subject).toMatch(/verify/i);
    expect(arg.html).toContain('Jordan');
    expect(arg.html).toContain('https://example.com/verify?t=abc');
    expect(arg.text).toContain('https://example.com/verify?t=abc');
  });

  it('escapes HTML in user-provided values', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await build({ send });
    const service = moduleRef.get(MailerService);

    await service.sendVerificationEmail('a@b.c', {
      name: '<script>alert(1)</script>',
      verifyUrl: 'https://example.com/verify',
    });

    const arg = send.mock.calls[0][0];
    expect(arg.html).not.toContain('<script>');
    expect(arg.html).toContain('&lt;script&gt;');
  });
});
