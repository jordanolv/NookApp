import { index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from '../auth/user';
import { server } from './server';

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
