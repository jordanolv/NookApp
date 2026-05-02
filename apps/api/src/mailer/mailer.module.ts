import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service';
import { MAILER_DRIVER } from './mailer.types';
import { makeDriverFactory } from './mailer.factory';
import { MailerDevController } from './mailer.dev.controller';

@Global()
@Module({
  controllers: [MailerDevController],
  providers: [
    MailerService,
    {
      provide: MAILER_DRIVER,
      inject: [ConfigService],
      useFactory: makeDriverFactory,
    },
  ],
  exports: [MailerService],
})
export class MailerModule {}
