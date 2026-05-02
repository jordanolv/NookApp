import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { account, session, user, verification, type Database } from '@nookapp/db';
import type { MailerService } from '../mailer/mailer.service';

export interface AuthFactoryDeps {
  db: Database;
  mailer: MailerService;
  env: {
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    WEB_URL: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
  };
}

export type Auth = ReturnType<typeof createAuth>;

export function createAuth({ db, mailer, env }: AuthFactoryDeps) {
  const discordEnabled = Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user,
        account,
        session,
        verification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_URL],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      callbackURL: `${env.WEB_URL}/app`,
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.sendVerificationEmail(user.email, {
          name: user.name,
          verifyUrl: url,
        });
      },
    },
    ...(discordEnabled
      ? {
          socialProviders: {
            discord: {
              clientId: env.DISCORD_CLIENT_ID!,
              clientSecret: env.DISCORD_CLIENT_SECRET!,
            },
          },
        }
      : {}),
  });
}
