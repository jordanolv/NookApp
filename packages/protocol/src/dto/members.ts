import { z } from 'zod';

export const memberUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
export type MemberUser = z.infer<typeof memberUserSchema>;

export const memberPublicSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  userId: z.string(),
  roleIds: z.array(z.string()),
  permissions: z.number().int().nonnegative(),
  isOwner: z.boolean(),
  joinedAt: z.string().datetime(),
  user: memberUserSchema,
});
export type MemberPublic = z.infer<typeof memberPublicSchema>;
