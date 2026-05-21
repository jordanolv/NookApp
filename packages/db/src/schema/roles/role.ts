import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { server } from '../servers/server';

export const role = pgTable(
  'role',
  {
    id: text('id').primaryKey(),
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    position: integer('position').notNull().default(0),
    permissions: bigint('permissions', { mode: 'number' }).notNull().default(0),
    isEveryone: boolean('is_everyone').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    serverIdx: index('role_server_idx').on(t.serverId),
    everyoneUniq: uniqueIndex('role_everyone_uniq')
      .on(t.serverId)
      .where(sql`${t.isEveryone} = true`),
  }),
);
