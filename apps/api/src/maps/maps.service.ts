import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { map, member, type Database } from '@nookapp/db';
import { DEFAULT_MAP, mapDataSchema, type MapData, type MapPublic } from '@nookapp/protocol';
import { DB } from '../database/database.module';

function toMapPublic(serverId: string, row: typeof map.$inferSelect | null): MapPublic {
  if (!row) {
    return { serverId, data: DEFAULT_MAP, updatedAt: new Date(0).toISOString() };
  }
  // Stale shape from earlier migration → fall back so the client gets a valid map.
  const parsed = mapDataSchema.safeParse(row.data);
  return {
    serverId: row.serverId,
    data: parsed.success ? parsed.data : DEFAULT_MAP,
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class MapsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getMap(serverId: string, userId: string): Promise<MapPublic> {
    await this.requireMember(serverId, userId);
    const [row] = await this.db.select().from(map).where(eq(map.serverId, serverId)).limit(1);
    return toMapPublic(serverId, row ?? null);
  }

  async saveMap(serverId: string, userId: string, data: MapData): Promise<MapPublic> {
    await this.requireRole(serverId, userId, ['owner', 'admin']);
    const [saved] = await this.db
      .insert(map)
      .values({ serverId, data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: map.serverId,
        set: { data, updatedAt: new Date() },
      })
      .returning();
    return toMapPublic(serverId, saved);
  }

  private async requireMember(serverId: string, userId: string) {
    const [m] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!m) throw new ForbiddenException('Not a member of this server');
  }

  private async requireRole(
    serverId: string,
    userId: string,
    roles: Array<'owner' | 'admin' | 'member'>,
  ) {
    const [m] = await this.db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!m || !roles.includes(m.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
