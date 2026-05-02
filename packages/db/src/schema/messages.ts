import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './users';
import { channel } from './servers';

export const message = pgTable(
  'message',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channel.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => ({
    channelIdx: index('message_channel_idx').on(t.channelId),
    authorIdx: index('message_author_idx').on(t.authorId),
  }),
);
