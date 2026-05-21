import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from '../auth/user';

export const server = pgTable(
  'server',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    iconUrl: text('icon_url'),
    bannerUrl: text('banner_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUniq: uniqueIndex('server_slug_uniq').on(t.slug),
    ownerIdx: index('server_owner_idx').on(t.ownerId),
  }),
);
