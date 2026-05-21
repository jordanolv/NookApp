import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { member } from '../servers/member';
import { role } from './role';

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
