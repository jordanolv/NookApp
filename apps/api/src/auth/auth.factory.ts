import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { usernameSchema } from '@nookapp/protocol';
import { account, session, user, verification, type Database } from '@nookapp/db';
import type { MailerService } from '../mailer/mailer.service';

export interface AuthFactoryDeps {
  db: Database;
  mailer: MailerService;
  env: {
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    WEB_URL: string;
  };
}

export type Auth = ReturnType<typeof createAuth>;

export function createAuth({ db, mailer, env }: AuthFactoryDeps) {
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

        const parsed = usernameSchema.safeParse(
          typeof ctx.body?.username === 'string' ? ctx.body.username.toLowerCase().trim() : '',
        );
        if (!parsed.success) {
          throw new APIError('UNPROCESSABLE_ENTITY', {
            code: 'INVALID_USERNAME',
            message: parsed.error.issues[0]?.message ?? 'Invalid username',
          });
        }
        ctx.body.username = parsed.data;

        // A returning user (email already registered) is notified by email; Better Auth then
        // rejects the duplicate sign-up. Check this BEFORE username uniqueness so re-using the
        // same username does not short-circuit with a confusing "username taken" error.
        const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : null;
        if (email) {
          const [existing] = await db
            .select({ name: user.name })
            .from(user)
            .where(eq(user.email, email))
            .limit(1);
          if (existing) {
            await mailer
              .sendAlreadyRegistered(email, {
                name: existing.name,
                loginUrl: `${env.WEB_URL}/auth/login`,
                resetUrl: `${env.WEB_URL}/auth/forgot-password`,
              })
              .catch(() => undefined);
            return;
          }
        }

        const [usernameTaken] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.username, parsed.data))
          .limit(1);
        if (usernameTaken) {
          throw new APIError('UNPROCESSABLE_ENTITY', {
            code: 'USERNAME_TAKEN',
            message: 'This username is already taken',
          });
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
      // Behind Traefik (prod) the client IP is in x-forwarded-for. In local dev there is no
      // proxy, so let Better Auth fall back to the connection IP to keep rate limiting working.
      ipAddress:
        process.env.NODE_ENV === 'production' ? { ipAddressHeaders: ['x-forwarded-for'] } : {},
    },
    user: {
      additionalFields: {
        username: { type: 'string', required: false, input: true },
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
  });
}
