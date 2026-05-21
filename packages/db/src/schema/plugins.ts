import { boolean, index, json, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { server } from './servers';

export const serverPlugin = pgTable(
  'server_plugin',
  {
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    pluginId: text('plugin_id').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    config: json('config').default({}),
    enabledAt: timestamp('enabled_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.serverId, t.pluginId] }),
    serverIdx: index('server_plugin_server_idx').on(t.serverId),
  }),
);
