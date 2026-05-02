import { z } from 'zod';

export const SOCKET_EVENTS = {
  PlayerJoined: 'player:joined',
  PlayerLeft: 'player:left',
  PlayerMoved: 'player:moved',
  MessageSent: 'message:sent',
  MessageDeleted: 'message:deleted',
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

export const messageSentPayloadSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type MessageSentPayload = z.infer<typeof messageSentPayloadSchema>;
