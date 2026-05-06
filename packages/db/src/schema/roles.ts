import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { member, server } from './servers';

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

export const memberRole = pgTable(
  'member_role',
  {
    memberId: text('member_id')
      .notNull()
      .references(() => member.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.memberId, t.roleId] }),
    memberIdx: index('member_role_member_idx').on(t.memberId),
    roleIdx: index('member_role_role_idx').on(t.roleId),
  }),
);
