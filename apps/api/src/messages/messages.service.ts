import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, lt } from 'drizzle-orm';
import { channel, member, message, type Database } from '@nookapp/db';
import {
  hasPermission,
  PERMISSIONS,
  type CreateMessageInput,
  type MessagePublic,
  type UpdateMessageInput,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';

function toMessagePublic(row: typeof message.$inferSelect): MessagePublic {
  return {
    id: row.id,
    channelId: row.channelId,
    authorId: row.authorId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly rolesService: RolesService,
  ) {}

  async listMessages(
    serverId: string,
    channelId: string,
    userId: string,
    opts: { limit?: number; before?: string },
  ): Promise<MessagePublic[]> {
    await this.requireChannelMember(serverId, channelId, userId);

    const limit = Math.min(opts.limit ?? 50, 100);
    const conditions = [eq(message.channelId, channelId)];
    if (opts.before) {
      conditions.push(lt(message.createdAt, new Date(opts.before)));
    }

    const rows = await this.db
      .select()
      .from(message)
      .where(and(...conditions))
      .orderBy(desc(message.createdAt))
      .limit(limit);

    return rows.map(toMessagePublic).reverse();
  }

  async countByServer(serverId: string): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ channelId: message.channelId, total: count() })
      .from(message)
      .innerJoin(channel, eq(channel.id, message.channelId))
      .where(eq(channel.serverId, serverId))
      .groupBy(message.channelId);

    const result: Record<string, number> = {};
    for (const r of rows) result[r.channelId] = Number(r.total);
    return result;
  }

  async createMessage(
    serverId: string,
    channelId: string,
    userId: string,
    input: CreateMessageInput,
  ): Promise<MessagePublic> {
    await this.requireChannelMember(serverId, channelId, userId);

    const [created] = await this.db
      .insert(message)
      .values({
        id: randomUUID(),
        channelId,
        authorId: userId,
        content: input.content,
      })
      .returning();

    return toMessagePublic(created);
  }

  async updateMessage(
    serverId: string,
    channelId: string,
    messageId: string,
    userId: string,
    input: UpdateMessageInput,
  ): Promise<MessagePublic> {
    await this.requireChannelMember(serverId, channelId, userId);
    const existing = await this.requireMessage(channelId, messageId);

    if (existing.authorId !== userId) {
      throw new ForbiddenException('Can only edit your own messages');
    }

    const [updated] = await this.db
      .update(message)
      .set({ content: input.content, editedAt: new Date() })
      .where(eq(message.id, messageId))
      .returning();

    return toMessagePublic(updated);
  }

  async deleteMessage(
    serverId: string,
    channelId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    await this.requireChannelMember(serverId, channelId, userId);
    const existing = await this.requireMessage(channelId, messageId);

    if (existing.authorId !== userId) {
      const authz = await this.rolesService.resolveAuthz(serverId, userId);
      if (!authz.isOwner && !hasPermission(authz.permissions, PERMISSIONS.ManageMessages)) {
        throw new ForbiddenException('Missing ManageMessages permission');
      }
    }

    await this.db.delete(message).where(eq(message.id, messageId));
  }

  private async requireMessage(channelId: string, messageId: string) {
    const [row] = await this.db
      .select()
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.channelId, channelId)))
      .limit(1);
    if (!row) throw new NotFoundException('Message not found');
    return row;
  }

  private async requireChannelMember(serverId: string, channelId: string, userId: string) {
    const [ch] = await this.db
      .select({ id: channel.id })
      .from(channel)
      .where(and(eq(channel.id, channelId), eq(channel.serverId, serverId)))
      .limit(1);
    if (!ch) throw new ForbiddenException('Channel not found in this server');

    const [m] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!m) throw new ForbiddenException('Not a member of this server');
  }
}
