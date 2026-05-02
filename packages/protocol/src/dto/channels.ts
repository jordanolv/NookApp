import { z } from 'zod';

export const channelTypeSchema = z.enum(['text', 'voice', 'game']);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const createChannelInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: channelTypeSchema.default('text'),
  position: z.number().int().min(0).optional(),
  parentId: z.string().optional(),
});
export type CreateChannelInput = z.infer<typeof createChannelInputSchema>;

export const updateChannelInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
  parentId: z.string().nullable().optional(),
});
export type UpdateChannelInput = z.infer<typeof updateChannelInputSchema>;

export const channelPublicSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  type: channelTypeSchema,
  name: z.string(),
  position: z.number(),
  parentId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ChannelPublic = z.infer<typeof channelPublicSchema>;
