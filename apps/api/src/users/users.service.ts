import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ne } from 'drizzle-orm';
import { directMessage, member, message, server, user, type Database } from '@nookapp/db';
import type {
  DeleteAccountInput,
  OwnedServerSummary,
  UiLayout,
  UiLayoutPatchInput,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getUiLayout(userId: string): Promise<UiLayout> {
    const [row] = await this.db
      .select({ uiLayout: user.uiLayout })
      .from(user)
      .where(eq(user.id, userId));
    return (row?.uiLayout as UiLayout | undefined) ?? {};
  }

  async patchUiLayout(userId: string, input: UiLayoutPatchInput): Promise<UiLayout> {
    const current = await this.getUiLayout(userId);
    const next: UiLayout = { ...current };
    for (const [key, value] of Object.entries(input.entries)) {
      if (value === null) {
        delete next[key];
      } else {
        next[key] = { ...(next[key] ?? {}), ...value };
      }
    }
    await this.db
      .update(user)
      .set({ uiLayout: next, updatedAt: new Date() })
      .where(eq(user.id, userId));
    return next;
  }

  async listOwnedServers(userId: string): Promise<OwnedServerSummary[]> {
    const owned = await this.db
      .select({ id: server.id, name: server.name })
      .from(server)
      .where(eq(server.ownerId, userId));

    const summaries: OwnedServerSummary[] = [];
    for (const srv of owned) {
      const members = await this.db
        .select({ userId: member.userId, name: user.name })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(eq(member.serverId, srv.id), ne(member.userId, userId)))
        .orderBy(asc(member.joinedAt));
      summaries.push({ id: srv.id, name: srv.name, members });
    }
    return summaries;
  }

  async exportData(userId: string) {
    const [profile] = await this.db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        uiLayout: user.uiLayout,
      })
      .from(user)
      .where(eq(user.id, userId));

    const memberships = await this.db
      .select({ serverId: member.serverId, serverName: server.name, joinedAt: member.joinedAt })
      .from(member)
      .innerJoin(server, eq(member.serverId, server.id))
      .where(eq(member.userId, userId));

    const ownedServers = await this.db
      .select({ id: server.id, name: server.name, createdAt: server.createdAt })
      .from(server)
      .where(eq(server.ownerId, userId));

    const channelMessages = await this.db
      .select({
        id: message.id,
        channelId: message.channelId,
        content: message.content,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
      })
      .from(message)
      .where(eq(message.authorId, userId));

    const directMessages = await this.db
      .select({
        id: directMessage.id,
        conversationId: directMessage.conversationId,
        content: directMessage.content,
        createdAt: directMessage.createdAt,
        editedAt: directMessage.editedAt,
      })
      .from(directMessage)
      .where(eq(directMessage.authorId, userId));

    return {
      exportedAt: new Date().toISOString(),
      profile: profile ?? null,
      memberships,
      ownedServers,
      channelMessages,
      directMessages,
    };
  }

  async deleteAccount(userId: string, input: DeleteAccountInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: server.id })
        .from(server)
        .where(eq(server.ownerId, userId));

      for (const { id: serverId } of owned) {
        const target = input.transfers[serverId] ?? null;

        if (target) {
          const [valid] = await tx
            .select({ userId: member.userId })
            .from(member)
            .where(and(eq(member.serverId, serverId), eq(member.userId, target)))
            .limit(1);
          if (!valid) {
            throw new BadRequestException(`Invalid transfer target for server ${serverId}`);
          }
          await tx.update(server).set({ ownerId: target }).where(eq(server.id, serverId));
        } else {
          await tx.delete(server).where(eq(server.id, serverId));
        }
      }

      await tx.delete(user).where(eq(user.id, userId));
    });
  }
}
