import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './users';

export const server = pgTable(
  'server',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    iconUrl: text('icon_url'),
    bannerUrl: text('banner_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUniq: uniqueIndex('server_slug_uniq').on(t.slug),
    ownerIdx: index('server_owner_idx').on(t.ownerId),
  }),
);

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

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastX: integer('last_x'),
    lastY: integer('last_y'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    serverMemberUniq: uniqueIndex('member_server_user_uniq').on(t.serverId, t.userId),
    serverIdx: index('member_server_idx').on(t.serverId),
    userIdx: index('member_user_idx').on(t.userId),
  }),
);

export const serverInvite = pgTable(
  'server_invite',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    maxUses: integer('max_uses'),
    uses: integer('uses').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeUniq: uniqueIndex('server_invite_code_uniq').on(t.code),
    serverIdx: index('server_invite_server_idx').on(t.serverId),
  }),
);
