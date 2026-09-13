import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from '../auth/user';
import { channel } from './channel';

export const channelRead = pgTable(
  'channel_read',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channel.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    channelUserUniq: uniqueIndex('channel_read_channel_user_uniq').on(t.channelId, t.userId),
    userIdx: index('channel_read_user_idx').on(t.userId),
  }),
);
