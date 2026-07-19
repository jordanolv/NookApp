import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from '../auth/user';
import { server } from './server';

export const serverBan = pgTable(
  'server_ban',
  {
    id: text('id').primaryKey(),
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    bannedBy: text('banned_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    serverUserUniq: uniqueIndex('server_ban_server_user_uniq').on(t.serverId, t.userId),
    serverIdx: index('server_ban_server_idx').on(t.serverId),
  }),
);
