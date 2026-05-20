import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { member, server, user, type Database } from '@nookapp/db';
import { hasPermission, PERMISSIONS, type MemberPublic } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class MembersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly rolesService: RolesService,
  ) {}

  async listMembers(serverId: string, userId: string): Promise<MemberPublic[]> {
    await this.rolesService.resolveAuthz(serverId, userId);
    const rows = await this.db
      .select({
        member: member,
        user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.serverId, serverId));
    const authzMap = await this.rolesService.resolveAuthzMap(serverId);
    return rows.map(({ member: m, user: u }) => {
      const a = authzMap.get(m.id) ?? { roleIds: [], permissions: 0, isOwner: false };
      return {
        id: m.id,
        serverId: m.serverId,
        userId: m.userId,
        roleIds: a.roleIds,
        permissions: a.permissions,
        isOwner: a.isOwner,
        joinedAt: m.joinedAt.toISOString(),
        user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl ?? null },
      };
    });
  }

  async getMember(serverId: string, userId: string): Promise<MemberPublic> {
    const [row] = await this.db
      .select({
        member: member,
        user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Member not found');
    const authz = await this.rolesService.resolveAuthz(serverId, userId);
    return {
      id: row.member.id,
      serverId: row.member.serverId,
      userId: row.member.userId,
      roleIds: authz.roleIds,
      permissions: authz.permissions,
      isOwner: authz.isOwner,
      joinedAt: row.member.joinedAt.toISOString(),
      user: { id: row.user.id, name: row.user.name, avatarUrl: row.user.avatarUrl ?? null },
    };
  }

  async getLastPosition(
    serverId: string,
    userId: string,
  ): Promise<{ x: number; y: number } | null> {
    const [row] = await this.db
      .select({ lastX: member.lastX, lastY: member.lastY })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!row || row.lastX === null || row.lastY === null) return null;
    return { x: row.lastX, y: row.lastY };
  }

  async updateLastPosition(serverId: string, userId: string, x: number, y: number): Promise<void> {
    await this.db
      .update(member)
      .set({ lastX: Math.round(x), lastY: Math.round(y) })
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)));
  }

  async kickMember(serverId: string, targetUserId: string, requesterId: string): Promise<void> {
    if (targetUserId === requesterId) {
      throw new ForbiddenException('Cannot kick yourself');
    }

    const requesterAuthz = await this.rolesService.resolveAuthz(serverId, requesterId);
    if (
      !requesterAuthz.isOwner &&
      !hasPermission(requesterAuthz.permissions, PERMISSIONS.ManageMembers)
    ) {
      throw new ForbiddenException('Missing ManageMembers permission');
    }

    const [srv] = await this.db
      .select({ ownerId: server.ownerId })
      .from(server)
      .where(eq(server.id, serverId))
      .limit(1);
    if (!srv) throw new NotFoundException('Server not found');
    if (srv.ownerId === targetUserId) {
      throw new ForbiddenException('Cannot kick the server owner');
    }

    const targetAuthz = await this.rolesService.resolveAuthz(serverId, targetUserId);
    if (!requesterAuthz.isOwner && targetAuthz.topPosition >= requesterAuthz.topPosition) {
      throw new ForbiddenException('Cannot kick a member ranked at or above you');
    }

    const result = await this.db
      .delete(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, targetUserId)))
      .returning();
    if (!result.length) throw new NotFoundException('Member not found');
  }
}
