import { boolean, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { server } from '../servers/server';
import { channelCategory } from './channel-category';

export const channel = pgTable(
  'channel',
  {
    id: text('id').primaryKey(),
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => channelCategory.id, { onDelete: 'set null' }),
    type: text('type', { enum: ['text', 'voice', 'forum', 'game', 'widget'] })
      .notNull()
      .default('text'),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    parentId: text('parent_id'),
    mapZone: jsonb('map_zone'),
    iconUrl: text('icon_url'),
    bannerUrl: text('banner_url'),
    widgetKind: text('widget_kind'),
    showStat: boolean('show_stat').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    serverIdx: index('channel_server_idx').on(t.serverId),
    categoryIdx: index('channel_category_idx').on(t.categoryId),
  }),
);
