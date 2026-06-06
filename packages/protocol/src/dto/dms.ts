import { z } from 'zod';

export const dmUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});
export type DmUser = z.infer<typeof dmUserSchema>;

export const directMessagePublicSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
});
export type DirectMessagePublic = z.infer<typeof directMessagePublicSchema>;

export const dmConversationSchema = z.object({
  id: z.string(),
  otherUser: dmUserSchema,
  lastMessage: directMessagePublicSchema.nullable(),
  lastMessageAt: z.string().datetime(),
  unreadCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type DmConversation = z.infer<typeof dmConversationSchema>;

export const openDmInputSchema = z.object({
  recipientId: z.string().min(1),
});
export type OpenDmInput = z.infer<typeof openDmInputSchema>;

export const createDirectMessageInputSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type CreateDirectMessageInput = z.infer<typeof createDirectMessageInputSchema>;
