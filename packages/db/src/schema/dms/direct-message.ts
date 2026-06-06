import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from '../auth/user';
import { dmConversation } from './conversation';

export const directMessage = pgTable(
  'direct_message',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => dmConversation.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => ({
    conversationIdx: index('direct_message_conversation_idx').on(t.conversationId),
    authorIdx: index('direct_message_author_idx').on(t.authorId),
  }),
);
