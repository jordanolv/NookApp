import { customType, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { server } from '../servers/server';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const map = pgTable('map', {
  serverId: text('server_id')
    .primaryKey()
    .references(() => server.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  // Y.js binary state: reloading it keeps item ids stable across API restarts,
  // so reconnecting clients merge idempotently instead of duplicating cells.
  state: bytea('state'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
