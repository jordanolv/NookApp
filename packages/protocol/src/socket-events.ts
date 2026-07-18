import { z } from 'zod';

export const SOCKET_EVENTS = {
  PlayerHello: 'player:hello',
  PlayerJoined: 'player:joined',
  PlayerLeft: 'player:left',
  PlayerMoved: 'player:moved',
  PlayerSnapshot: 'player:snapshot',
  PlayerAppearance: 'player:appearance',
  MessageSent: 'message:sent',
  MessageUpdated: 'message:updated',
  MessageDeleted: 'message:deleted',
  DmMessage: 'dm:message',
  DmTyping: 'dm:typing',
  VoiceJoin: 'voice:join',
  VoiceLeave: 'voice:leave',
  VoiceJoined: 'voice:joined',
  VoiceLeft: 'voice:left',
  VoiceSnapshot: 'voice:snapshot',
} as const;
export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export const playerAppearanceSchema = z.object({
  body: z.string(),
  eyes: z.string(),
  outfit: z.string(),
  hair: z.string(),
  accessory: z.string().nullable(),
});
export type PlayerAppearance = z.infer<typeof playerAppearanceSchema>;

// Optional pose overlaid on top of position. Absent = standing/walking.
// Extensible: add further poses to the enum as new interactions land.
export const playerPoseSchema = z.enum(['sit']);
export type PlayerPose = z.infer<typeof playerPoseSchema>;

export const playerMovedPayloadSchema = z.object({
  userId: z.string(),
  x: z.number(),
  y: z.number(),
  dir: z.enum(['up', 'down', 'left', 'right']),
  moving: z.boolean(),
  pose: playerPoseSchema.optional(),
});
export type PlayerMovedPayload = z.infer<typeof playerMovedPayloadSchema>;

export const playerHelloPayloadSchema = z.object({
  serverId: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  dir: z.enum(['up', 'down', 'left', 'right']),
  appearance: playerAppearanceSchema.optional(),
});
export type PlayerHelloPayload = z.infer<typeof playerHelloPayloadSchema>;

export const playerStateSchema = z.object({
  userId: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  dir: z.enum(['up', 'down', 'left', 'right']),
  appearance: playerAppearanceSchema.optional(),
  pose: playerPoseSchema.optional(),
});
export type PlayerState = z.infer<typeof playerStateSchema>;

export const playerAppearancePayloadSchema = z.object({
  userId: z.string(),
  appearance: playerAppearanceSchema,
});
export type PlayerAppearancePayload = z.infer<typeof playerAppearancePayloadSchema>;

export const playerSnapshotPayloadSchema = z.object({
  you: playerStateSchema,
  others: z.array(playerStateSchema),
});
export type PlayerSnapshotPayload = z.infer<typeof playerSnapshotPayloadSchema>;

export const voiceParticipantSchema = z.object({
  userId: z.string(),
  name: z.string(),
  channelId: z.string(),
});
export type VoiceParticipant = z.infer<typeof voiceParticipantSchema>;

export const voiceSnapshotPayloadSchema = z.object({
  participants: z.array(voiceParticipantSchema),
});
export type VoiceSnapshotPayload = z.infer<typeof voiceSnapshotPayloadSchema>;

export const messageSentPayloadSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type MessageSentPayload = z.infer<typeof messageSentPayloadSchema>;

export const messageDeletedPayloadSchema = z.object({
  id: z.string(),
  channelId: z.string(),
});
export type MessageDeletedPayload = z.infer<typeof messageDeletedPayloadSchema>;

export const dmTypingPayloadSchema = z.object({
  conversationId: z.string(),
  fromUserId: z.string(),
});
export type DmTypingPayload = z.infer<typeof dmTypingPayloadSchema>;
