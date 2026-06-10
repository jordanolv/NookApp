import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { account, session, user, verification, type Database } from '@nookapp/db';
import type { MailerService } from '../mailer/mailer.service';
import { generateUniqueUsername } from './username-generator';

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
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-up/email') return;
        const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : null;
        if (!email) return;
        const [existing] = await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.email, email))
          .limit(1);
        if (!existing) return;
        try {
          await mailer.sendAlreadyRegistered(email, {
            name: existing.name,
            loginUrl: `${env.WEB_URL}/auth/login`,
            resetUrl: `${env.WEB_URL}/auth/forgot-password`,
          });
        } catch {
          // never block sign-up on a notification failure
        }
      }),
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/forget-password': { window: 60, max: 3 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    user: {
      additionalFields: {
        username: { type: 'string', required: false, input: false },
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async ({
          user,
          newEmail,
          url,
        }: {
          user: { email: string; name: string };
          newEmail: string;
          url: string;
        }) => {
          await mailer.sendChangeEmail(user.email, {
            name: user.name,
            newEmail,
            confirmUrl: url,
          });
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (u) => ({
            data: { ...u, username: await generateUniqueUsername(u.name, db) },
          }),
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      sendResetPassword: async ({ user, url }) => {
        await mailer.sendResetPasswordEmail(user.email, {
          name: user.name,
          resetUrl: url,
        });
      },
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
