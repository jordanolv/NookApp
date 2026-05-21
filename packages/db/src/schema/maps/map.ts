import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { server } from '../servers/server';

export const map = pgTable('map', {
  serverId: text('server_id')
    .primaryKey()
    .references(() => server.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
