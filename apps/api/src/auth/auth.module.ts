import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB } from '../database/database.module';
import { MailerService } from '../mailer/mailer.service';
import { createAuth } from './auth.factory';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AUTH } from './auth.types';

@Global()
@Module({
  providers: [
    {
      provide: AUTH,
      inject: [DB, MailerService, ConfigService],
      useFactory: (db, mailer, config: ConfigService) =>
        createAuth({
          db,
          mailer,
          env: {
            BETTER_AUTH_SECRET: requireEnv(config, 'BETTER_AUTH_SECRET'),
            BETTER_AUTH_URL: config.get<string>('BETTER_AUTH_URL', 'http://localhost:3000'),
            WEB_URL: config.get<string>('NUXT_PUBLIC_WEB_URL', 'http://localhost:3001'),
            DISCORD_CLIENT_ID: config.get<string>('DISCORD_CLIENT_ID'),
            DISCORD_CLIENT_SECRET: config.get<string>('DISCORD_CLIENT_SECRET'),
          },
        }),
    },
    AuthService,
    AuthGuard,
  ],
  exports: [AUTH, AuthService, AuthGuard],
})
export class AuthModule {}

function requireEnv(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}
