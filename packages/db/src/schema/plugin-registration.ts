import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './users';

export const pluginRegistration = pgTable(
  'plugin_registration',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    apiKeyHash: text('api_key_hash').notNull(),
    apiKeyPrefix: text('api_key_prefix').notNull(),
    status: text('status', { enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
    capabilities: jsonb('capabilities'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastConnectedAt: timestamp('last_connected_at', { withTimezone: true }),
  },
  (t) => ({
    slugUniq: uniqueIndex('plugin_registration_slug_uniq').on(t.slug),
    keyHashUniq: uniqueIndex('plugin_registration_key_hash_uniq').on(t.apiKeyHash),
    ownerIdx: index('plugin_registration_owner_idx').on(t.ownerUserId),
  }),
);
