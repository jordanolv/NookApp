import { z } from 'zod';

export const channelTypeSchema = z.enum(['text', 'voice', 'forum', 'game', 'widget']);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const widgetKindSchema = z.enum(['notes', 'gaming']);
export type WidgetKind = z.infer<typeof widgetKindSchema>;

export const mapZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type MapZone = z.infer<typeof mapZoneSchema>;

const channelColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex string like #74b86f');

const channelIconNameSchema = z.string().min(1).max(40);

export const createChannelInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: channelTypeSchema.default('text'),
  position: z.number().int().min(0).optional(),
  parentId: z.string().optional(),
  mapZone: mapZoneSchema.optional(),
  widgetKind: widgetKindSchema.optional(),
  showStat: z.boolean().default(true),
  color: channelColorSchema.nullable().optional(),
  iconName: channelIconNameSchema.nullable().optional(),
});
export type CreateChannelInput = z.infer<typeof createChannelInputSchema>;

export const updateChannelInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
  parentId: z.string().nullable().optional(),
  mapZone: mapZoneSchema.nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  showStat: z.boolean().optional(),
  color: channelColorSchema.nullable().optional(),
  iconName: channelIconNameSchema.nullable().optional(),
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
  bannerUrl: z.string().nullable(),
  widgetKind: widgetKindSchema.nullable(),
  showStat: z.boolean(),
  color: channelColorSchema.nullable(),
  iconName: channelIconNameSchema.nullable(),
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
  color: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

export const categoryPublicSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  name: z.string(),
  position: z.number(),
  color: z.string().nullable(),
  iconUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type CategoryPublic = z.infer<typeof categoryPublicSchema>;
