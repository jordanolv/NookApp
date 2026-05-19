import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { map, member, type Database } from '@nookapp/db';
import {
  DEFAULT_MAP,
  hasPermission,
  mapDataSchema,
  PERMISSIONS,
  type MapData,
  type MapPublic,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';

// Drop unknown layer rows so a renamed/removed cell shape doesn't fail the whole parse.
function sanitizeRawData(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as { layers?: { floors?: unknown; walls?: unknown; decor?: unknown } };
  if (!obj.layers || typeof obj.layers !== 'object') return raw;
  return {
    ...obj,
    layers: {
      ...obj.layers,
      floors: Array.isArray(obj.layers.floors) ? obj.layers.floors : [],
      walls: Array.isArray(obj.layers.walls) ? obj.layers.walls : [],
      decor: Array.isArray(obj.layers.decor) ? obj.layers.decor : [],
    },
  };
}

function toMapPublic(serverId: string, row: typeof map.$inferSelect | null): MapPublic {
  if (!row) {
    return { serverId, data: DEFAULT_MAP, updatedAt: new Date(0).toISOString() };
  }
  const parsed = mapDataSchema.safeParse(sanitizeRawData(row.data));
  return {
    serverId: row.serverId,
    data: parsed.success ? parsed.data : DEFAULT_MAP,
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class MapsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly rolesService: RolesService,
  ) {}

  async getMap(serverId: string, userId: string): Promise<MapPublic> {
    await this.requireMember(serverId, userId);
    const [row] = await this.db.select().from(map).where(eq(map.serverId, serverId)).limit(1);
    return toMapPublic(serverId, row ?? null);
  }

  async saveMap(serverId: string, userId: string, data: MapData): Promise<MapPublic> {
    await this.requirePermission(serverId, userId, PERMISSIONS.ManageMap);
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

  private async requirePermission(serverId: string, userId: string, flag: number) {
    const authz = await this.rolesService.resolveAuthz(serverId, userId);
    if (authz.isOwner) return;
    if (!hasPermission(authz.permissions, flag)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
