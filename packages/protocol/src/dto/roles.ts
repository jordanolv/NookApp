import { z } from 'zod';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex string like #RRGGBB');

export const rolePublicSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  position: z.number().int().nonnegative(),
  permissions: z.number().int().nonnegative(),
  isEveryone: z.boolean(),
  createdAt: z.string().datetime(),
});
export type RolePublic = z.infer<typeof rolePublicSchema>;

export const createRoleInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: hexColorSchema.nullable().optional(),
  permissions: z.number().int().nonnegative().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleInputSchema>;

export const updateRoleInputSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: hexColorSchema.nullable().optional(),
  permissions: z.number().int().nonnegative().optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleInputSchema>;

// Ordered from highest position (top) to lowest (bottom). @everyone is implicit at the bottom.
export const reorderRolesInputSchema = z.object({
  roleIds: z.array(z.string()).min(1),
});
export type ReorderRolesInput = z.infer<typeof reorderRolesInputSchema>;

export const setMemberRolesInputSchema = z.object({
  roleIds: z.array(z.string()),
});
export type SetMemberRolesInput = z.infer<typeof setMemberRolesInputSchema>;
