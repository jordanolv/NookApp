import { z } from 'zod';
import { componentTreeSchema } from './components';

export const PLUGIN_ACTION_TYPES = {
  ChatSend: 'chat:send',
  ModalOpen: 'modal:open',
  ModalClose: 'modal:close',
  PanelUpdate: 'panel:update',
  ChannelViewUpdate: 'channel-view:update',
  Notify: 'notify:user',
  WorldObjectSpawn: 'world-object:spawn',
  WorldObjectRemove: 'world-object:remove',
  StorageGet: 'storage:get',
  StorageSet: 'storage:set',
  StorageDelete: 'storage:delete',
  CommandAck: 'command:ack',
} as const;

export type PluginActionType = (typeof PLUGIN_ACTION_TYPES)[keyof typeof PLUGIN_ACTION_TYPES];

export const chatSendPayloadSchema = z.object({
  serverId: z.string(),
  channelId: z.string(),
  content: z.string().max(2000),
  components: componentTreeSchema.optional(),
});

export const modalOpenPayloadSchema = z.object({
  serverId: z.string(),
  userId: z.string(),
  channelId: z.string().optional(),
  modalId: z.string(),
  title: z.string().max(120),
  children: componentTreeSchema,
  submitLabel: z.string().max(32).optional(),
  cancelLabel: z.string().max(32).optional(),
  interactionId: z.string().optional(),
});

export const modalClosePayloadSchema = z.object({
  userId: z.string(),
  modalId: z.string(),
});

// Push an update to a sidebar panel. If userId is set the panel is per-user; otherwise broadcast.
export const panelUpdatePayloadSchema = z.object({
  serverId: z.string(),
  sidebarItemId: z.string(),
  userId: z.string().optional(),
  children: componentTreeSchema,
});

export const channelViewUpdatePayloadSchema = z.object({
  serverId: z.string(),
  channelId: z.string(),
  children: componentTreeSchema,
});

export const notifyPayloadSchema = z.object({
  serverId: z.string(),
  userId: z.string(),
  content: z.string().max(280),
});

export const worldObjectSpawnPayloadSchema = z.object({
  serverId: z.string(),
  id: z.string(),
  x: z.number(),
  y: z.number(),
  texture: z.string(),
  frame: z.union([z.number(), z.string()]).optional(),
  label: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const worldObjectRemovePayloadSchema = z.object({
  serverId: z.string(),
  id: z.string(),
});

export const storageGetPayloadSchema = z.object({
  serverId: z.string(),
  key: z.string().max(120),
});

export const storageSetPayloadSchema = z.object({
  serverId: z.string(),
  key: z.string().max(120),
  value: z.unknown(),
});

export const storageDeletePayloadSchema = z.object({
  serverId: z.string(),
  key: z.string().max(120),
});

// Ack a command immediately so the user UI can show feedback before the real action lands.
export const commandAckPayloadSchema = z.object({
  interactionId: z.string(),
  ephemeralContent: z.string().max(280).optional(),
});

// Fire-and-forget action envelope.
export const pluginActionSchema = z.object({
  kind: z.literal('action'),
  type: z.string(),
  payload: z.unknown(),
});

// Request envelope expects a matching response.
export const pluginRequestSchema = z.object({
  kind: z.literal('request'),
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
});

export const pluginResponseOkSchema = z.object({
  kind: z.literal('response'),
  id: z.string(),
  ok: z.literal(true),
  result: z.unknown(),
});

export const pluginResponseErrSchema = z.object({
  kind: z.literal('response'),
  id: z.string(),
  ok: z.literal(false),
  error: z.string(),
});

export const pluginResponseSchema = z.union([pluginResponseOkSchema, pluginResponseErrSchema]);

export type ChatSendPayload = z.infer<typeof chatSendPayloadSchema>;
export type ModalOpenPayload = z.infer<typeof modalOpenPayloadSchema>;
export type ModalClosePayload = z.infer<typeof modalClosePayloadSchema>;
export type PanelUpdatePayload = z.infer<typeof panelUpdatePayloadSchema>;
export type ChannelViewUpdatePayload = z.infer<typeof channelViewUpdatePayloadSchema>;
export type NotifyPayload = z.infer<typeof notifyPayloadSchema>;
export type WorldObjectSpawnPayload = z.infer<typeof worldObjectSpawnPayloadSchema>;
export type WorldObjectRemovePayload = z.infer<typeof worldObjectRemovePayloadSchema>;
export type StorageGetPayload = z.infer<typeof storageGetPayloadSchema>;
export type StorageSetPayload = z.infer<typeof storageSetPayloadSchema>;
export type StorageDeletePayload = z.infer<typeof storageDeletePayloadSchema>;
export type CommandAckPayload = z.infer<typeof commandAckPayloadSchema>;
export type PluginActionEnvelope = z.infer<typeof pluginActionSchema>;
export type PluginRequestEnvelope = z.infer<typeof pluginRequestSchema>;
export type PluginResponseEnvelope = z.infer<typeof pluginResponseSchema>;
