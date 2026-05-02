import { z } from 'zod';

export const SOCKET_EVENTS = {
  PlayerHello: 'player:hello',
  PlayerJoined: 'player:joined',
  PlayerLeft: 'player:left',
  PlayerMoved: 'player:moved',
  PlayerSnapshot: 'player:snapshot',
  MessageSent: 'message:sent',
  MessageDeleted: 'message:deleted',
  VoiceJoin: 'voice:join',
  VoiceLeave: 'voice:leave',
  VoiceJoined: 'voice:joined',
  VoiceLeft: 'voice:left',
  VoiceSnapshot: 'voice:snapshot',
} as const;
export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export const playerMovedPayloadSchema = z.object({
  userId: z.string(),
  x: z.number(),
  y: z.number(),
  dir: z.enum(['up', 'down', 'left', 'right']),
  moving: z.boolean(),
});
export type PlayerMovedPayload = z.infer<typeof playerMovedPayloadSchema>;

export const playerHelloPayloadSchema = z.object({
  serverId: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  dir: z.enum(['up', 'down', 'left', 'right']),
});
export type PlayerHelloPayload = z.infer<typeof playerHelloPayloadSchema>;

export const playerStateSchema = z.object({
  userId: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  dir: z.enum(['up', 'down', 'left', 'right']),
});
export type PlayerState = z.infer<typeof playerStateSchema>;

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
