import { index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from '../auth/user';
import { server } from './server';

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
