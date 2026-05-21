import { z } from 'zod';

export const PLUGIN_EVENT_TYPES = {
  CommandInvoke: 'command:invoke',
  Interaction: 'interaction:dispatch',
  PlayerJoined: 'player:joined',
  PlayerLeft: 'player:left',
  MessageSent: 'message:sent',
  VoiceJoined: 'voice:joined',
  VoiceLeft: 'voice:left',
  WorldObjectClicked: 'world-object:clicked',
  ChannelViewOpened: 'channel-view:opened',
  PanelOpened: 'panel:opened',
  ServerEnabled: 'server:enabled',
  ServerDisabled: 'server:disabled',
} as const;

export type PluginEventType = (typeof PLUGIN_EVENT_TYPES)[keyof typeof PLUGIN_EVENT_TYPES];

export const commandInvokePayloadSchema = z.object({
  featureId: z.string(),
  commandName: z.string(),
  args: z.record(z.string(), z.unknown()),
  serverId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  userName: z.string(),
  interactionId: z.string(),
});

export const interactionSurfaceSchema = z.enum(['modal', 'panel', 'channel-view', 'message']);

export const interactionDispatchPayloadSchema = z.object({
  surface: interactionSurfaceSchema,
  surfaceId: z.string(),
  featureId: z.string().optional(),
  actionId: z.string(),
  values: z.record(z.string(), z.unknown()).optional(),
  serverId: z.string(),
  channelId: z.string().optional(),
  userId: z.string(),
  interactionId: z.string(),
});

export const playerJoinedPayloadSchema = z.object({
  serverId: z.string(),
  userId: z.string(),
  userName: z.string(),
});

export const playerLeftPayloadSchema = z.object({
  serverId: z.string(),
  userId: z.string(),
});

export const pluginMessageSentPayloadSchema = z.object({
  serverId: z.string(),
  channelId: z.string(),
  messageId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  content: z.string(),
});

export const voiceChangePayloadSchema = z.object({
  serverId: z.string(),
  channelId: z.string(),
  userId: z.string(),
});

export const worldObjectClickedPayloadSchema = z.object({
  serverId: z.string(),
  objectId: z.string(),
  userId: z.string(),
});

export const channelViewOpenedPayloadSchema = z.object({
  serverId: z.string(),
  channelId: z.string(),
  channelType: z.string(),
  userId: z.string(),
});

export const panelOpenedPayloadSchema = z.object({
  serverId: z.string(),
  featureId: z.string(),
  menuId: z.string(),
  userId: z.string(),
});

export const serverScopeChangePayloadSchema = z.object({
  serverId: z.string(),
});

// Envelope from host to plugin. Payload shape depends on `type`.
export const pluginEventSchema = z.object({
  kind: z.literal('event'),
  type: z.string(),
  payload: z.unknown(),
});

export type PluginEventEnvelope = z.infer<typeof pluginEventSchema>;
export type CommandInvokePayload = z.infer<typeof commandInvokePayloadSchema>;
export type InteractionDispatchPayload = z.infer<typeof interactionDispatchPayloadSchema>;
export type PlayerJoinedPayload = z.infer<typeof playerJoinedPayloadSchema>;
export type PlayerLeftPayload = z.infer<typeof playerLeftPayloadSchema>;
export type PluginMessageSentPayload = z.infer<typeof pluginMessageSentPayloadSchema>;
export type VoiceChangePayload = z.infer<typeof voiceChangePayloadSchema>;
export type WorldObjectClickedPayload = z.infer<typeof worldObjectClickedPayloadSchema>;
export type ChannelViewOpenedPayload = z.infer<typeof channelViewOpenedPayloadSchema>;
export type PanelOpenedPayload = z.infer<typeof panelOpenedPayloadSchema>;
export type ServerScopeChangePayload = z.infer<typeof serverScopeChangePayloadSchema>;
