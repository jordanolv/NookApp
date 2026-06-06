import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gt, inArray, lt, ne } from 'drizzle-orm';
import {
  directMessage,
  dmConversation,
  dmParticipant,
  member,
  user,
  type Database,
} from '@nookapp/db';
import type {
  CreateDirectMessageInput,
  DirectMessagePublic,
  DmConversation,
  DmUser,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';

function toMessagePublic(row: typeof directMessage.$inferSelect): DirectMessagePublic {
  return {
    id: row.id,
    conversationId: row.conversationId,
    authorId: row.authorId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class DmsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async openConversation(userId: string, recipientId: string): Promise<DmConversation> {
    if (recipientId === userId) throw new ForbiddenException('Cannot message yourself');
    await this.requireUserExists(recipientId);

    const existing = await this.findDirectConversation(userId, recipientId);
    if (existing) return this.buildSummary(existing, userId);

    const conversationId = randomUUID();
    await this.db.insert(dmConversation).values({ id: conversationId });
    await this.db.insert(dmParticipant).values([
      { id: randomUUID(), conversationId, userId },
      { id: randomUUID(), conversationId, userId: recipientId },
    ]);
    return this.buildSummary(conversationId, userId);
  }

  async listConversations(userId: string): Promise<DmConversation[]> {
    const parts = await this.db
      .select({ conversationId: dmParticipant.conversationId })
      .from(dmParticipant)
      .where(eq(dmParticipant.userId, userId));

    const summaries = await Promise.all(
      parts.map((p) => this.buildSummary(p.conversationId, userId)),
    );
    return summaries.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
  }

  async listCandidates(userId: string): Promise<DmUser[]> {
    const myServers = this.db
      .select({ serverId: member.serverId })
      .from(member)
      .where(eq(member.userId, userId));

    const rows = await this.db
      .selectDistinct({
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(and(inArray(member.serverId, myServers), ne(member.userId, userId)));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username,
      avatarUrl: r.avatarUrl ?? null,
    }));
  }

  async lookupByUsername(username: string, requesterId: string): Promise<DmUser> {
    const handle = username.trim().toLowerCase();
    const [found] = await this.db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      })
      .from(user)
      .where(eq(user.username, handle))
      .limit(1);
    if (!found || found.id === requesterId) throw new NotFoundException('User not found');
    return {
      id: found.id,
      name: found.name,
      username: found.username,
      avatarUrl: found.avatarUrl ?? null,
    };
  }

  async listMessages(
    conversationId: string,
    userId: string,
    opts: { limit?: number; before?: string },
  ): Promise<DirectMessagePublic[]> {
    await this.requireParticipant(conversationId, userId);

    const limit = Math.min(opts.limit ?? 50, 100);
    const conditions = [eq(directMessage.conversationId, conversationId)];
    if (opts.before) conditions.push(lt(directMessage.createdAt, new Date(opts.before)));

    const rows = await this.db
      .select()
      .from(directMessage)
      .where(and(...conditions))
      .orderBy(desc(directMessage.createdAt))
      .limit(limit);

    return rows.map(toMessagePublic).reverse();
  }

  async createMessage(
    conversationId: string,
    userId: string,
    input: CreateDirectMessageInput,
  ): Promise<{ message: DirectMessagePublic; participantIds: string[] }> {
    await this.requireParticipant(conversationId, userId);

    const now = new Date();
    const [created] = await this.db
      .insert(directMessage)
      .values({ id: randomUUID(), conversationId, authorId: userId, content: input.content })
      .returning();

    await this.db
      .update(dmConversation)
      .set({ lastMessageAt: now })
      .where(eq(dmConversation.id, conversationId));
    await this.db
      .update(dmParticipant)
      .set({ lastReadAt: now })
      .where(
        and(eq(dmParticipant.conversationId, conversationId), eq(dmParticipant.userId, userId)),
      );

    return {
      message: toMessagePublic(created),
      participantIds: await this.participantIds(conversationId),
    };
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.requireParticipant(conversationId, userId);
    await this.db
      .update(dmParticipant)
      .set({ lastReadAt: new Date() })
      .where(
        and(eq(dmParticipant.conversationId, conversationId), eq(dmParticipant.userId, userId)),
      );
  }

  private async participantIds(conversationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: dmParticipant.userId })
      .from(dmParticipant)
      .where(eq(dmParticipant.conversationId, conversationId));
    return rows.map((r) => r.userId);
  }

  private async requireParticipant(conversationId: string, userId: string) {
    const [p] = await this.db
      .select({ id: dmParticipant.id })
      .from(dmParticipant)
      .where(
        and(eq(dmParticipant.conversationId, conversationId), eq(dmParticipant.userId, userId)),
      )
      .limit(1);
    if (!p) throw new ForbiddenException('Not a participant of this conversation');
  }

  private async requireUserExists(recipientId: string) {
    const [target] = await this.db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, recipientId))
      .limit(1);
    if (!target) throw new NotFoundException('User not found');
  }

  private async findDirectConversation(
    userId: string,
    recipientId: string,
  ): Promise<string | null> {
    const mine = await this.db
      .select({ conversationId: dmParticipant.conversationId })
      .from(dmParticipant)
      .where(eq(dmParticipant.userId, userId));
    if (!mine.length) return null;

    const candidateIds = mine.map((r) => r.conversationId);
    const rows = await this.db
      .select({
        conversationId: dmParticipant.conversationId,
        userId: dmParticipant.userId,
      })
      .from(dmParticipant)
      .where(inArray(dmParticipant.conversationId, candidateIds));

    const byConversation = new Map<string, Set<string>>();
    for (const r of rows) {
      const set = byConversation.get(r.conversationId) ?? new Set<string>();
      set.add(r.userId);
      byConversation.set(r.conversationId, set);
    }
    for (const [conversationId, members] of byConversation) {
      if (members.size === 2 && members.has(userId) && members.has(recipientId)) {
        return conversationId;
      }
    }
    return null;
  }

  private async buildSummary(conversationId: string, userId: string): Promise<DmConversation> {
    const [self] = await this.db
      .select({ lastReadAt: dmParticipant.lastReadAt })
      .from(dmParticipant)
      .where(
        and(eq(dmParticipant.conversationId, conversationId), eq(dmParticipant.userId, userId)),
      )
      .limit(1);
    if (!self) throw new ForbiddenException('Not a participant of this conversation');

    const [conv] = await this.db
      .select()
      .from(dmConversation)
      .where(eq(dmConversation.id, conversationId))
      .limit(1);
    if (!conv) throw new NotFoundException('Conversation not found');

    const [other] = await this.db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      })
      .from(dmParticipant)
      .innerJoin(user, eq(user.id, dmParticipant.userId))
      .where(
        and(eq(dmParticipant.conversationId, conversationId), ne(dmParticipant.userId, userId)),
      )
      .limit(1);
    if (!other) throw new NotFoundException('Conversation partner not found');

    const [last] = await this.db
      .select()
      .from(directMessage)
      .where(eq(directMessage.conversationId, conversationId))
      .orderBy(desc(directMessage.createdAt))
      .limit(1);

    const unreadConditions = [
      eq(directMessage.conversationId, conversationId),
      ne(directMessage.authorId, userId),
    ];
    if (self.lastReadAt) unreadConditions.push(gt(directMessage.createdAt, self.lastReadAt));
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(directMessage)
      .where(and(...unreadConditions));

    return {
      id: conversationId,
      otherUser: {
        id: other.id,
        name: other.name,
        username: other.username,
        avatarUrl: other.avatarUrl ?? null,
      },
      lastMessage: last ? toMessagePublic(last) : null,
      lastMessageAt: conv.lastMessageAt.toISOString(),
      unreadCount: Number(total),
      createdAt: conv.createdAt.toISOString(),
    };
  }
}
