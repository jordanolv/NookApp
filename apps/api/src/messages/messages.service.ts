import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';
import { channel, member, message, type Database } from '@nookapp/db';
import type { CreateMessageInput, MessagePublic } from '@nookapp/protocol';
import { DB } from '../database/database.module';

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
  constructor(@Inject(DB) private readonly db: Database) {}

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
