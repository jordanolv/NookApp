import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    uiLayout: jsonb('ui_layout').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUniq: uniqueIndex('user_email_uniq').on(t.email),
  }),
);
