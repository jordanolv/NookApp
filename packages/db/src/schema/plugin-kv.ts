import { index, json, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { server } from './servers';

export const pluginKv = pgTable(
  'plugin_kv',
  {
    id: text('id').primaryKey(),
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    pluginId: text('plugin_id').notNull(),
    key: text('key').notNull(),
    value: json('value'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique('plugin_kv_uniq').on(t.serverId, t.pluginId, t.key),
    serverIdx: index('plugin_kv_server_idx').on(t.serverId),
  }),
);
