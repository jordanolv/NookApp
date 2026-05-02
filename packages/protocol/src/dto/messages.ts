import { z } from 'zod';

export const createMessageInputSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

export const messagePublicSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
});
export type MessagePublic = z.infer<typeof messagePublicSchema>;
