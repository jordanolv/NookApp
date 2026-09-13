import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, lt, ne, sql } from 'drizzle-orm';
import { channel, channelRead, member, message, user, type Database } from '@nookapp/db';
import {
  hasPermission,
  PERMISSIONS,
  resolveMentions,
  type CreateMessageInput,
  type MessagePublic,
  type ServerUnread,
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
    mentions: row.mentions ?? [],
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
        mentions: await this.resolveMentions(serverId, input.content),
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
      .set({
        content: input.content,
        mentions: await this.resolveMentions(serverId, input.content),
        editedAt: new Date(),
      })
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

  /** Unread and mention counts per channel, relative to the member's last read timestamp. */
  async unreadByServer(serverId: string, userId: string): Promise<ServerUnread> {
    const mentionsMe = JSON.stringify([userId]);
    const rows = await this.db
      .select({
        channelId: message.channelId,
        total: count(),
        mentions: sql<number>`count(*) filter (where ${message.mentions} @> ${mentionsMe}::jsonb)`,
      })
      .from(message)
      .innerJoin(channel, eq(channel.id, message.channelId))
      .leftJoin(
        channelRead,
        and(eq(channelRead.channelId, message.channelId), eq(channelRead.userId, userId)),
      )
      .where(
        and(
          eq(channel.serverId, serverId),
          ne(message.authorId, userId),
          sql`${message.createdAt} > coalesce(${channelRead.lastReadAt}, 'epoch'::timestamptz)`,
        ),
      )
      .groupBy(message.channelId);

    const unread: ServerUnread = {};
    for (const r of rows)
      unread[r.channelId] = { messages: Number(r.total), mentions: Number(r.mentions) };
    return unread;
  }

  async markChannelRead(serverId: string, channelId: string, userId: string): Promise<void> {
    await this.requireChannelMember(serverId, channelId, userId);
    await this.db
      .insert(channelRead)
      .values({ id: randomUUID(), channelId, userId, lastReadAt: new Date() })
      .onConflictDoUpdate({
        target: [channelRead.channelId, channelRead.userId],
        set: { lastReadAt: new Date() },
      });
  }

  private async resolveMentions(serverId: string, content: string): Promise<string[]> {
    if (!content.includes('@')) return [];
    const members = await this.db
      .select({ id: user.id, name: user.name })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.serverId, serverId));
    return resolveMentions(content, members);
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
