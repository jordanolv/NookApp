import { z } from 'zod';

const idPattern = /^[a-z0-9_-]+$/;

export const slashCommandOptionTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'user',
  'channel',
]);

export const slashCommandOptionSchema = z.object({
  name: z.string().regex(idPattern),
  description: z.string().max(120),
  type: slashCommandOptionTypeSchema,
  required: z.boolean().optional(),
  choices: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .max(25)
    .optional(),
});

export const slashCommandDefSchema = z.object({
  name: z.string().regex(idPattern).max(32),
  description: z.string().max(120),
  options: z.array(slashCommandOptionSchema).max(10).optional(),
});

export const channelTypeDefSchema = z.object({
  type: z.string().regex(idPattern).max(32),
  name: z.string().max(48),
  description: z.string().max(160),
  icon: z.string().max(64),
});

export const sidebarItemDefSchema = z.object({
  id: z.string().regex(idPattern).max(32),
  label: z.string().max(48),
  icon: z.string().max(64),
  placement: z.enum(['sidebar', 'menu']).optional(),
});

export const platformEventNameSchema = z.enum([
  'player:joined',
  'player:left',
  'message:sent',
  'voice:joined',
  'voice:left',
  'world-object:clicked',
]);

export const capabilitiesSchema = z.object({
  slashCommands: z.array(slashCommandDefSchema).max(50).default([]),
  channelTypes: z.array(channelTypeDefSchema).max(10).default([]),
  sidebarItems: z.array(sidebarItemDefSchema).max(10).default([]),
  events: z.array(platformEventNameSchema).default([]),
});

export type SlashCommandOptionType = z.infer<typeof slashCommandOptionTypeSchema>;
export type SlashCommandOption = z.infer<typeof slashCommandOptionSchema>;
export type SlashCommandDef = z.infer<typeof slashCommandDefSchema>;
export type ChannelTypeDef = z.infer<typeof channelTypeDefSchema>;
export type SidebarItemDef = z.infer<typeof sidebarItemDefSchema>;
export type PlatformEventName = z.infer<typeof platformEventNameSchema>;
export type PluginCapabilities = z.infer<typeof capabilitiesSchema>;
