import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from '../auth/user';
import { dmConversation } from './conversation';

export const dmParticipant = pgTable(
  'dm_participant',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => dmConversation.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    convUserUniq: uniqueIndex('dm_participant_conv_user_uniq').on(t.conversationId, t.userId),
    userIdx: index('dm_participant_user_idx').on(t.userId),
    convIdx: index('dm_participant_conv_idx').on(t.conversationId),
  }),
);
