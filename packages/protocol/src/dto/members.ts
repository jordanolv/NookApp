import { z } from 'zod';
import { MEMBER_ROLES } from '../permissions';

export const memberRoleSchema = z.enum(MEMBER_ROLES);

export const updateMemberInputSchema = z.object({
  role: z.enum(['admin', 'member']),
});
export type UpdateMemberInput = z.infer<typeof updateMemberInputSchema>;

export const memberPublicSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  userId: z.string(),
  role: memberRoleSchema,
  joinedAt: z.string().datetime(),
});
export type MemberPublic = z.infer<typeof memberPublicSchema>;
