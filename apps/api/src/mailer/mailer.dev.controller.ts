import { Body, Controller, ForbiddenException, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MailerService } from './mailer.service';

const bodySchema = z.object({
  to: z.string().email(),
  name: z.string().min(1).max(64).default('there'),
});

@ApiTags('mailer (dev)')
@Controller('mailer/dev')
export class MailerDevController {
  constructor(private readonly mailer: MailerService) {}

  @Post('send-test')
  @HttpCode(202)
  async sendTest(@Body() body: unknown) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('dev endpoint disabled in production');
    }
    const { to, name } = bodySchema.parse(body);
    await this.mailer.sendVerificationEmail(to, {
      name,
      verifyUrl: 'http://localhost:3001/auth/verify?token=dev-token',
    });
    return { ok: true, to };
  }
}
