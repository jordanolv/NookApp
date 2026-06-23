import { z } from 'zod';

export const emailSchema = z.string().email().max(254);
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128);
export const displayNameSchema = z.string().min(2).max(32);
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers and underscores');

export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: displayNameSchema,
  username: usernameSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const verifyEmailInputSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

export const userPublicSchema = z.object({
  id: z.string(),
  email: emailSchema,
  name: displayNameSchema,
  avatarUrl: z.string().url().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});
export type UserPublic = z.infer<typeof userPublicSchema>;

export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
