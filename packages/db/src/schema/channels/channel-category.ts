import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { server } from '../servers/server';

export const channelCategory = pgTable(
  'channel_category',
  {
    id: text('id').primaryKey(),
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    color: text('color'),
    iconUrl: text('icon_url'),
    bannerUrl: text('banner_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    serverIdx: index('channel_category_server_idx').on(t.serverId),
  }),
);
