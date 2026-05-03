import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { channel, member, type Database } from '@nookapp/db';
import type { ChannelPublic, CreateChannelInput, UpdateChannelInput } from '@nookapp/protocol';
import { DB } from '../database/database.module';

function toChannelPublic(row: typeof channel.$inferSelect): ChannelPublic {
  return {
    id: row.id,
    serverId: row.serverId,
    type: row.type,
    name: row.name,
    position: row.position,
    parentId: row.parentId ?? null,
    mapZone: (row.mapZone as { x: number; y: number; w: number; h: number } | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ChannelsService {
  constructor(@Inject(DB) private readonly db: Database) {}

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
    await this.requireRole(serverId, userId, ['owner', 'admin']);

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
    await this.requireRole(serverId, userId, ['owner', 'admin']);

    const [updated] = await this.db
      .update(channel)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.position !== undefined && { position: input.position }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.mapZone !== undefined && { mapZone: input.mapZone }),
      })
      .where(and(eq(channel.id, channelId), eq(channel.serverId, serverId)))
      .returning();

    if (!updated) throw new NotFoundException('Channel not found');
    return toChannelPublic(updated);
  }

  async deleteChannel(serverId: string, channelId: string, userId: string): Promise<void> {
    await this.requireRole(serverId, userId, ['owner', 'admin']);
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
