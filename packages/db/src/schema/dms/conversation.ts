import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const dmConversation = pgTable(
  'dm_conversation',
  {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    lastMessageIdx: index('dm_conversation_last_message_idx').on(t.lastMessageAt),
  }),
);
