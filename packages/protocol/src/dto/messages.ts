import { z } from 'zod';

export const createMessageInputSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

export const updateMessageInputSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type UpdateMessageInput = z.infer<typeof updateMessageInputSchema>;

export const messagePublicSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
  /** Ids of the members named with @ in the content, resolved server-side. */
  mentions: z.array(z.string()).default([]),
});
export type MessagePublic = z.infer<typeof messagePublicSchema>;

export const channelUnreadSchema = z.object({
  messages: z.number().int().nonnegative(),
  mentions: z.number().int().nonnegative(),
});
export type ChannelUnread = z.infer<typeof channelUnreadSchema>;

/** Per-channel unread state for one member, keyed by channel id. */
export const serverUnreadSchema = z.record(z.string(), channelUnreadSchema);
export type ServerUnread = z.infer<typeof serverUnreadSchema>;
