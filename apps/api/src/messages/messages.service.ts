import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, lt } from 'drizzle-orm';
import { channel, member, message, user, type Database } from '@nookapp/db';
import type { CreateMessageInput, MessagePublic } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { PluginGatewayService } from '../plugin-gateway/plugin-gateway.service';

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
    private readonly pluginGateway: PluginGatewayService,
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

    const msg = toMessagePublic(created);

    const [u] = await this.db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const authorName = u?.name ?? userId;

    void this.pluginGateway.dispatchEvent(serverId, 'message:sent', {
      serverId,
      channelId,
      messageId: created.id,
      authorId: userId,
      authorName,
      content: input.content,
    });

    if (input.content.startsWith('/')) {
      const [cmd, ...args] = input.content.slice(1).trim().split(/\s+/);
      if (cmd) {
        void this.pluginGateway.dispatchCommand(serverId, channelId, cmd, args, userId, authorName);
      }
    }

    return msg;
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
