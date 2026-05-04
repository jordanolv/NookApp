import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { member, type Database } from '@nookapp/db';
import type { MemberPublic, UpdateMemberInput } from '@nookapp/protocol';
import { DB } from '../database/database.module';

function toMemberPublic(row: typeof member.$inferSelect): MemberPublic {
  return {
    id: row.id,
    serverId: row.serverId,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
  };
}

@Injectable()
export class MembersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listMembers(serverId: string, userId: string): Promise<MemberPublic[]> {
    await this.requireMember(serverId, userId);
    const rows = await this.db.select().from(member).where(eq(member.serverId, serverId));
    return rows.map(toMemberPublic);
  }

  async getMember(serverId: string, userId: string): Promise<MemberPublic> {
    const [row] = await this.db
      .select()
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Member not found');
    return toMemberPublic(row);
  }

  async updateMember(
    serverId: string,
    targetUserId: string,
    requesterId: string,
    input: UpdateMemberInput,
  ): Promise<MemberPublic> {
    const [requester] = await this.db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, requesterId)))
      .limit(1);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const [target] = await this.db
      .select()
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, targetUserId)))
      .limit(1);

    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new ForbiddenException('Cannot change the owner role');
    if (requester.role === 'admin' && target.role === 'admin') {
      throw new ForbiddenException('Admins cannot change other admins');
    }

    const [updated] = await this.db
      .update(member)
      .set({ role: input.role })
      .where(and(eq(member.serverId, serverId), eq(member.userId, targetUserId)))
      .returning();

    return toMemberPublic(updated);
  }

  async kickMember(serverId: string, targetUserId: string, requesterId: string): Promise<void> {
    const [requester] = await this.db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, requesterId)))
      .limit(1);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const [target] = await this.db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, targetUserId)))
      .limit(1);

    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new ForbiddenException('Cannot kick the server owner');
    if (requester.role === 'admin' && target.role === 'admin') {
      throw new ForbiddenException('Admins cannot kick other admins');
    }

    await this.db
      .delete(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, targetUserId)));
  }

  private async requireMember(serverId: string, userId: string) {
    const [m] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!m) throw new ForbiddenException('Not a member of this server');
  }
}
