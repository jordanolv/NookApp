import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens');

export const createServerInputSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema.optional(),
});
export type CreateServerInput = z.infer<typeof createServerInputSchema>;

export const updateServerInputSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: slugSchema.optional(),
  iconUrl: z.string().url().nullable().optional(),
});
export type UpdateServerInput = z.infer<typeof updateServerInputSchema>;

export const serverPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  ownerId: z.string(),
  iconUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type ServerPublic = z.infer<typeof serverPublicSchema>;

export const createInviteInputSchema = z.object({
  maxUses: z.number().int().min(1).max(1000).optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
});
export type CreateInviteInput = z.infer<typeof createInviteInputSchema>;

export const invitePublicSchema = z.object({
  id: z.string(),
  code: z.string(),
  serverId: z.string(),
  maxUses: z.number().nullable(),
  uses: z.number(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type InvitePublic = z.infer<typeof invitePublicSchema>;
