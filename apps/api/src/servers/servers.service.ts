import { randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { channel, member, server, serverInvite, type Database } from '@nookapp/db';
import type {
  CreateInviteInput,
  CreateServerInput,
  InvitePublic,
  ServerPublic,
  UpdateServerInput,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function toServerPublic(row: typeof server.$inferSelect): ServerPublic {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerId: row.ownerId,
    iconUrl: row.iconUrl ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ServersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async createServer(userId: string, input: CreateServerInput): Promise<ServerPublic> {
    const baseSlug = input.slug ?? slugify(input.name);
    const slug = `${baseSlug}-${randomBytes(2).toString('hex')}`;

    const [created] = await this.db
      .insert(server)
      .values({ id: randomUUID(), slug, name: input.name, ownerId: userId })
      .returning();

    await Promise.all([
      this.db.insert(member).values({
        id: randomUUID(),
        serverId: created.id,
        userId,
        role: 'owner',
      }),
      this.db.insert(channel).values({
        id: randomUUID(),
        serverId: created.id,
        type: 'text',
        name: 'general',
        position: 0,
      }),
    ]);

    return toServerPublic(created);
  }

  async listMyServers(userId: string): Promise<ServerPublic[]> {
    const rows = await this.db
      .select({ server })
      .from(member)
      .innerJoin(server, eq(member.serverId, server.id))
      .where(eq(member.userId, userId));

    return rows.map((r) => toServerPublic(r.server));
  }

  async getServer(serverId: string, userId: string): Promise<ServerPublic> {
    await this.requireMember(serverId, userId);
    const [row] = await this.db.select().from(server).where(eq(server.id, serverId)).limit(1);
    if (!row) throw new NotFoundException('Server not found');
    return toServerPublic(row);
  }

  async getServerBySlug(slug: string, userId: string): Promise<ServerPublic> {
    const [row] = await this.db.select().from(server).where(eq(server.slug, slug)).limit(1);
    if (!row) throw new NotFoundException('Server not found');
    await this.requireMember(row.id, userId);
    return toServerPublic(row);
  }

  async updateServer(
    serverId: string,
    userId: string,
    input: UpdateServerInput,
  ): Promise<ServerPublic> {
    await this.requireRole(serverId, userId, ['owner', 'admin']);

    if (input.slug) {
      const [conflict] = await this.db
        .select({ id: server.id })
        .from(server)
        .where(and(eq(server.slug, input.slug), sql`${server.id} != ${serverId}`))
        .limit(1);
      if (conflict) throw new ConflictException('Slug already taken');
    }

    const [updated] = await this.db
      .update(server)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }),
      })
      .where(eq(server.id, serverId))
      .returning();

    if (!updated) throw new NotFoundException('Server not found');
    return toServerPublic(updated);
  }

  async deleteServer(serverId: string, userId: string): Promise<void> {
    await this.requireRole(serverId, userId, ['owner']);
    const result = await this.db.delete(server).where(eq(server.id, serverId)).returning();
    if (!result.length) throw new NotFoundException('Server not found');
  }

  async createInvite(
    serverId: string,
    userId: string,
    input: CreateInviteInput,
  ): Promise<InvitePublic> {
    await this.requireMember(serverId, userId);

    const code = randomBytes(5).toString('base64url').slice(0, 8).toUpperCase();
    const expiresAt = input.expiresInHours
      ? new Date(Date.now() + input.expiresInHours * 3_600_000)
      : null;

    const [invite] = await this.db
      .insert(serverInvite)
      .values({
        id: randomUUID(),
        code,
        serverId,
        createdByUserId: userId,
        maxUses: input.maxUses ?? null,
        expiresAt,
      })
      .returning();

    return {
      id: invite.id,
      code: invite.code,
      serverId: invite.serverId,
      maxUses: invite.maxUses ?? null,
      uses: invite.uses,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
    };
  }

  async joinViaInvite(code: string, userId: string): Promise<ServerPublic> {
    const [invite] = await this.db
      .select()
      .from(serverInvite)
      .where(eq(serverInvite.code, code))
      .limit(1);

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invite has expired');
    }
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new ForbiddenException('Invite has reached its maximum uses');
    }

    const [existing] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, invite.serverId), eq(member.userId, userId)))
      .limit(1);
    if (existing) throw new ConflictException('Already a member of this server');

    await Promise.all([
      this.db.insert(member).values({
        id: randomUUID(),
        serverId: invite.serverId,
        userId,
        role: 'member',
      }),
      this.db
        .update(serverInvite)
        .set({ uses: invite.uses + 1 })
        .where(eq(serverInvite.id, invite.id)),
    ]);

    const [row] = await this.db
      .select()
      .from(server)
      .where(eq(server.id, invite.serverId))
      .limit(1);
    return toServerPublic(row);
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
