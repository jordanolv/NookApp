import { z } from 'zod';

export const channelTypeSchema = z.enum(['text', 'voice', 'forum', 'game']);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const mapZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type MapZone = z.infer<typeof mapZoneSchema>;

export const createChannelInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: channelTypeSchema.default('text'),
  position: z.number().int().min(0).optional(),
  parentId: z.string().optional(),
  mapZone: mapZoneSchema.optional(),
});
export type CreateChannelInput = z.infer<typeof createChannelInputSchema>;

export const updateChannelInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
  parentId: z.string().nullable().optional(),
  mapZone: mapZoneSchema.nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});
export type UpdateChannelInput = z.infer<typeof updateChannelInputSchema>;

export const channelPublicSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  categoryId: z.string().nullable(),
  type: channelTypeSchema,
  name: z.string(),
  position: z.number(),
  parentId: z.string().nullable(),
  mapZone: mapZoneSchema.nullable(),
  iconUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ChannelPublic = z.infer<typeof channelPublicSchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.number().int().min(0).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

export const categoryPublicSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  name: z.string(),
  position: z.number(),
  createdAt: z.string().datetime(),
});
export type CategoryPublic = z.infer<typeof categoryPublicSchema>;
