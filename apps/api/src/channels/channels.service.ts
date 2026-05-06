import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { channel, member, type Database } from '@nookapp/db';
import {
  hasPermission,
  PERMISSIONS,
  type ChannelPublic,
  type CreateChannelInput,
  type UpdateChannelInput,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';

function toChannelPublic(row: typeof channel.$inferSelect): ChannelPublic {
  return {
    id: row.id,
    serverId: row.serverId,
    categoryId: row.categoryId ?? null,
    type: row.type,
    name: row.name,
    position: row.position,
    parentId: row.parentId ?? null,
    mapZone: (row.mapZone as { x: number; y: number; w: number; h: number } | null) ?? null,
    iconUrl: row.iconUrl ?? null,
    widgetKind: (row.widgetKind as ChannelPublic['widgetKind']) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ChannelsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly rolesService: RolesService,
  ) {}

  async listChannels(serverId: string, userId: string): Promise<ChannelPublic[]> {
    await this.requireMember(serverId, userId);
    const rows = await this.db
      .select()
      .from(channel)
      .where(eq(channel.serverId, serverId))
      .orderBy(asc(channel.position));
    return rows.map(toChannelPublic);
  }

  async createChannel(
    serverId: string,
    userId: string,
    input: CreateChannelInput,
  ): Promise<ChannelPublic> {
    await this.requirePermission(serverId, userId, PERMISSIONS.ManageChannels);

    const position = input.position ?? (await this.nextPosition(serverId));

    const [created] = await this.db
      .insert(channel)
      .values({
        id: randomUUID(),
        serverId,
        type: input.type,
        name: input.name,
        position,
        parentId: input.parentId ?? null,
        mapZone: input.mapZone ?? null,
        widgetKind: input.type === 'widget' ? (input.widgetKind ?? null) : null,
      })
      .returning();

    return toChannelPublic(created);
  }

  async updateChannel(
    serverId: string,
    channelId: string,
    userId: string,
    input: UpdateChannelInput,
  ): Promise<ChannelPublic> {
    await this.requirePermission(serverId, userId, PERMISSIONS.ManageChannels);

    const [updated] = await this.db
      .update(channel)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.position !== undefined && { position: input.position }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.mapZone !== undefined && { mapZone: input.mapZone }),
        ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      })
      .where(and(eq(channel.id, channelId), eq(channel.serverId, serverId)))
      .returning();

    if (!updated) throw new NotFoundException('Channel not found');
    return toChannelPublic(updated);
  }

  async deleteChannel(serverId: string, channelId: string, userId: string): Promise<void> {
    await this.requirePermission(serverId, userId, PERMISSIONS.ManageChannels);
    const result = await this.db
      .delete(channel)
      .where(and(eq(channel.id, channelId), eq(channel.serverId, serverId)))
      .returning();
    if (!result.length) throw new NotFoundException('Channel not found');
  }

  private async nextPosition(serverId: string): Promise<number> {
    const rows = await this.db
      .select({ position: channel.position })
      .from(channel)
      .where(eq(channel.serverId, serverId))
      .orderBy(asc(channel.position));
    return rows.length === 0 ? 0 : rows[rows.length - 1].position + 1;
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
