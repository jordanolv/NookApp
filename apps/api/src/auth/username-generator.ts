import { eq } from 'drizzle-orm';
import { user, type Database } from '@nookapp/db';

const MAX_LEN = 20;

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, MAX_LEN);
  return base.length >= 2 ? base : 'user';
}

export async function generateUniqueUsername(name: string, db: Database): Promise<string> {
  const base = slugify(name);

  for (let n = 1; ; n++) {
    const suffix = n === 1 ? '' : String(n);
    const candidate = base.slice(0, MAX_LEN - suffix.length) + suffix;
    const [taken] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
}
