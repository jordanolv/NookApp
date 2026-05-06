import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { member, memberRole, role, server, type Database } from '@nookapp/db';
import {
  ALL_PERMISSIONS,
  combinePermissions,
  DEFAULT_EVERYONE_PERMISSIONS,
  hasPermission,
  PERMISSIONS,
  type CreateRoleInput,
  type RolePublic,
  type SetMemberRolesInput,
  type UpdateRoleInput,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';

const OWNER_TOP_POSITION = Number.MAX_SAFE_INTEGER;

export interface MemberAuthz {
  memberId: string;
  isOwner: boolean;
  permissions: number;
  roleIds: string[];
  topPosition: number;
}

function toRolePublic(row: typeof role.$inferSelect): RolePublic {
  return {
    id: row.id,
    serverId: row.serverId,
    name: row.name,
    color: row.color ?? null,
    position: row.position,
    permissions: row.permissions,
    isEveryone: row.isEveryone,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class RolesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async ensureEveryoneRole(serverId: string): Promise<typeof role.$inferSelect> {
    const [existing] = await this.db
      .select()
      .from(role)
      .where(and(eq(role.serverId, serverId), eq(role.isEveryone, true)))
      .limit(1);
    if (existing) return existing;

    const [created] = await this.db
      .insert(role)
      .values({
        id: randomUUID(),
        serverId,
        name: '@everyone',
        position: 0,
        permissions: DEFAULT_EVERYONE_PERMISSIONS,
        isEveryone: true,
      })
      .returning();
    return created;
  }

  async listRoles(serverId: string): Promise<RolePublic[]> {
    const rows = await this.db
      .select()
      .from(role)
      .where(eq(role.serverId, serverId))
      .orderBy(desc(role.position), asc(role.createdAt));
    return rows.map(toRolePublic);
  }

  async resolveAuthz(serverId: string, userId: string): Promise<MemberAuthz> {
    const [srv] = await this.db
      .select({ ownerId: server.ownerId })
      .from(server)
      .where(eq(server.id, serverId))
      .limit(1);
    if (!srv) throw new NotFoundException('Server not found');

    const [mem] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!mem) throw new ForbiddenException('Not a member of this server');

    const isOwner = srv.ownerId === userId;

    const [everyone] = await this.db
      .select({ permissions: role.permissions })
      .from(role)
      .where(and(eq(role.serverId, serverId), eq(role.isEveryone, true)))
      .limit(1);

    const assigned = await this.db
      .select({ id: role.id, permissions: role.permissions, position: role.position })
      .from(memberRole)
      .innerJoin(role, eq(memberRole.roleId, role.id))
      .where(eq(memberRole.memberId, mem.id));

    if (isOwner) {
      return {
        memberId: mem.id,
        isOwner: true,
        permissions: ALL_PERMISSIONS,
        roleIds: assigned.map((r) => r.id),
        topPosition: OWNER_TOP_POSITION,
      };
    }

    const permissions = combinePermissions(
      everyone?.permissions ?? 0,
      ...assigned.map((r) => r.permissions),
    );
    const topPosition = assigned.reduce((max, r) => Math.max(max, r.position), 0);

    return {
      memberId: mem.id,
      isOwner: false,
      permissions,
      roleIds: assigned.map((r) => r.id),
      topPosition,
    };
  }

  async createRole(
    serverId: string,
    requesterId: string,
    input: CreateRoleInput,
  ): Promise<RolePublic> {
    const authz = await this.resolveAuthz(serverId, requesterId);
    this.assertManageRoles(authz);

    const requestedPerms = input.permissions ?? 0;
    this.assertPermissionsWithinScope(authz, requestedPerms);

    const [{ maxPosition } = { maxPosition: 0 }] = await this.db
      .select({ maxPosition: role.position })
      .from(role)
      .where(eq(role.serverId, serverId))
      .orderBy(desc(role.position))
      .limit(1);

    const newPosition = Math.min(maxPosition + 1, authz.topPosition - 1);
    if (!authz.isOwner && newPosition < 1) {
      throw new ForbiddenException('Cannot create a role at or above your highest role');
    }

    const [created] = await this.db
      .insert(role)
      .values({
        id: randomUUID(),
        serverId,
        name: input.name,
        color: input.color ?? null,
        position: Math.max(newPosition, 1),
        permissions: requestedPerms,
        isEveryone: false,
      })
      .returning();

    return toRolePublic(created);
  }

  async updateRole(
    serverId: string,
    roleId: string,
    requesterId: string,
    input: UpdateRoleInput,
  ): Promise<RolePublic> {
    const authz = await this.resolveAuthz(serverId, requesterId);
    this.assertManageRoles(authz);

    const [existing] = await this.db
      .select()
      .from(role)
      .where(and(eq(role.id, roleId), eq(role.serverId, serverId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Role not found');

    if (existing.isEveryone && input.name !== undefined && input.name !== existing.name) {
      throw new ForbiddenException('Cannot rename @everyone');
    }
    if (!existing.isEveryone) {
      this.assertCanManageRolePosition(authz, existing.position);
    }

    if (input.permissions !== undefined) {
      this.assertPermissionsWithinScope(authz, input.permissions);
    }

    const [updated] = await this.db
      .update(role)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.permissions !== undefined && { permissions: input.permissions }),
      })
      .where(eq(role.id, roleId))
      .returning();

    return toRolePublic(updated);
  }

  async deleteRole(serverId: string, roleId: string, requesterId: string): Promise<void> {
    const authz = await this.resolveAuthz(serverId, requesterId);
    this.assertManageRoles(authz);

    const [existing] = await this.db
      .select()
      .from(role)
      .where(and(eq(role.id, roleId), eq(role.serverId, serverId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isEveryone) throw new ForbiddenException('Cannot delete @everyone');

    this.assertCanManageRolePosition(authz, existing.position);

    await this.db.delete(role).where(eq(role.id, roleId));
  }

  async reorderRoles(
    serverId: string,
    requesterId: string,
    roleIds: string[],
  ): Promise<RolePublic[]> {
    const authz = await this.resolveAuthz(serverId, requesterId);
    this.assertManageRoles(authz);

    const rows = await this.db
      .select()
      .from(role)
      .where(and(eq(role.serverId, serverId), inArray(role.id, roleIds)));

    if (rows.length !== roleIds.length) {
      throw new NotFoundException('Some roles do not belong to this server');
    }
    if (rows.some((r) => r.isEveryone)) {
      throw new ConflictException('@everyone position is fixed');
    }

    for (const r of rows) this.assertCanManageRolePosition(authz, r.position);

    // roleIds[0] = highest visible role (after the requester's cap)
    const cap = authz.isOwner ? rows.length + 1 : authz.topPosition - 1;
    if (cap < 1) throw new ForbiddenException('Cannot reorder roles');

    const updates = roleIds.map((id, idx) => {
      const newPosition = Math.max(1, cap - idx);
      return this.db.update(role).set({ position: newPosition }).where(eq(role.id, id));
    });
    await Promise.all(updates);

    return this.listRoles(serverId);
  }

  async setMemberRoles(
    serverId: string,
    targetUserId: string,
    requesterId: string,
    input: SetMemberRolesInput,
  ): Promise<string[]> {
    const authz = await this.resolveAuthz(serverId, requesterId);
    this.assertManageRoles(authz);

    const [target] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, targetUserId)))
      .limit(1);
    if (!target) throw new NotFoundException('Member not found');

    const [srv] = await this.db
      .select({ ownerId: server.ownerId })
      .from(server)
      .where(eq(server.id, serverId))
      .limit(1);
    if (srv?.ownerId === targetUserId) {
      throw new ForbiddenException("Cannot change the owner's roles");
    }

    const desired = input.roleIds;
    const desiredRoles = desired.length
      ? await this.db
          .select()
          .from(role)
          .where(and(eq(role.serverId, serverId), inArray(role.id, desired)))
      : [];
    if (desiredRoles.length !== desired.length) {
      throw new NotFoundException('Some roles do not exist on this server');
    }
    if (desiredRoles.some((r) => r.isEveryone)) {
      throw new ConflictException('@everyone is implicit and cannot be assigned');
    }
    for (const r of desiredRoles) this.assertCanManageRolePosition(authz, r.position);

    const current = await this.db
      .select({ roleId: memberRole.roleId, position: role.position })
      .from(memberRole)
      .innerJoin(role, eq(memberRole.roleId, role.id))
      .where(eq(memberRole.memberId, target.id));

    // Requester can only add/remove roles they are allowed to manage.
    const desiredSet = new Set(desired);
    const currentSet = new Set(current.map((c) => c.roleId));
    for (const c of current) {
      if (!desiredSet.has(c.roleId)) this.assertCanManageRolePosition(authz, c.position);
    }

    const toAdd = desired.filter((id) => !currentSet.has(id));
    const toRemove = current.filter((c) => !desiredSet.has(c.roleId)).map((c) => c.roleId);

    if (toRemove.length) {
      await this.db
        .delete(memberRole)
        .where(and(eq(memberRole.memberId, target.id), inArray(memberRole.roleId, toRemove)));
    }
    if (toAdd.length) {
      await this.db
        .insert(memberRole)
        .values(toAdd.map((roleId) => ({ memberId: target.id, roleId })));
    }

    return desired;
  }

  async getRoleIdsForMember(memberId: string): Promise<string[]> {
    const rows = await this.db
      .select({ roleId: memberRole.roleId })
      .from(memberRole)
      .where(eq(memberRole.memberId, memberId));
    return rows.map((r) => r.roleId);
  }

  async resolveAuthzMap(
    serverId: string,
  ): Promise<Map<string, { roleIds: string[]; permissions: number; isOwner: boolean }>> {
    const [srv] = await this.db
      .select({ ownerId: server.ownerId })
      .from(server)
      .where(eq(server.id, serverId))
      .limit(1);
    if (!srv) throw new NotFoundException('Server not found');

    const members = await this.db
      .select({ id: member.id, userId: member.userId })
      .from(member)
      .where(eq(member.serverId, serverId));

    const [everyone] = await this.db
      .select({ permissions: role.permissions })
      .from(role)
      .where(and(eq(role.serverId, serverId), eq(role.isEveryone, true)))
      .limit(1);

    const memberIds = members.map((m) => m.id);
    const assignments = memberIds.length
      ? await this.db
          .select({ memberId: memberRole.memberId, roleId: role.id, permissions: role.permissions })
          .from(memberRole)
          .innerJoin(role, eq(memberRole.roleId, role.id))
          .where(inArray(memberRole.memberId, memberIds))
      : [];

    const byMember = new Map<string, { roleIds: string[]; basePerms: number }>();
    for (const m of members) byMember.set(m.id, { roleIds: [], basePerms: 0 });
    for (const a of assignments) {
      const entry = byMember.get(a.memberId);
      if (!entry) continue;
      entry.roleIds.push(a.roleId);
      entry.basePerms |= a.permissions;
    }

    const result = new Map<string, { roleIds: string[]; permissions: number; isOwner: boolean }>();
    for (const m of members) {
      const entry = byMember.get(m.id) ?? { roleIds: [], basePerms: 0 };
      const isOwner = srv.ownerId === m.userId;
      const permissions = isOwner
        ? ALL_PERMISSIONS
        : combinePermissions(everyone?.permissions ?? 0, entry.basePerms);
      result.set(m.id, { roleIds: entry.roleIds, permissions, isOwner });
    }
    return result;
  }

  private assertManageRoles(authz: MemberAuthz) {
    if (authz.isOwner) return;
    if (!hasPermission(authz.permissions, PERMISSIONS.ManageRoles)) {
      throw new ForbiddenException('Missing ManageRoles permission');
    }
  }

  private assertCanManageRolePosition(authz: MemberAuthz, position: number) {
    if (authz.isOwner) return;
    if (position >= authz.topPosition) {
      throw new ForbiddenException('Cannot manage a role at or above your highest role');
    }
  }

  private assertPermissionsWithinScope(authz: MemberAuthz, requested: number) {
    if (authz.isOwner) return;
    const outOfScope = requested & ~authz.permissions;
    if (outOfScope !== 0) {
      throw new ForbiddenException('Cannot grant permissions you do not have');
    }
  }
}
