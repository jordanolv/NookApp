import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { channelCategory, member, type Database } from '@nookapp/db';
import {
  hasPermission,
  PERMISSIONS,
  type CategoryPublic,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';

function toCategoryPublic(row: typeof channelCategory.$inferSelect): CategoryPublic {
  return {
    id: row.id,
    serverId: row.serverId,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly rolesService: RolesService,
  ) {}

  async listCategories(serverId: string, userId: string): Promise<CategoryPublic[]> {
    await this.requireMember(serverId, userId);
    const rows = await this.db
      .select()
      .from(channelCategory)
      .where(eq(channelCategory.serverId, serverId))
      .orderBy(asc(channelCategory.position));
    return rows.map(toCategoryPublic);
  }

  async createCategory(
    serverId: string,
    userId: string,
    input: CreateCategoryInput,
  ): Promise<CategoryPublic> {
    await this.requirePermission(serverId, userId, PERMISSIONS.ManageChannels);

    const position = input.position ?? (await this.nextPosition(serverId));

    const [created] = await this.db
      .insert(channelCategory)
      .values({ id: randomUUID(), serverId, name: input.name, position })
      .returning();

    return toCategoryPublic(created);
  }

  async updateCategory(
    serverId: string,
    categoryId: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryPublic> {
    await this.requirePermission(serverId, userId, PERMISSIONS.ManageChannels);

    const [updated] = await this.db
      .update(channelCategory)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.position !== undefined && { position: input.position }),
      })
      .where(and(eq(channelCategory.id, categoryId), eq(channelCategory.serverId, serverId)))
      .returning();

    if (!updated) throw new NotFoundException('Category not found');
    return toCategoryPublic(updated);
  }

  async deleteCategory(serverId: string, categoryId: string, userId: string): Promise<void> {
    await this.requirePermission(serverId, userId, PERMISSIONS.ManageChannels);
    const result = await this.db
      .delete(channelCategory)
      .where(and(eq(channelCategory.id, categoryId), eq(channelCategory.serverId, serverId)))
      .returning();
    if (!result.length) throw new NotFoundException('Category not found');
  }

  private async nextPosition(serverId: string): Promise<number> {
    const rows = await this.db
      .select({ position: channelCategory.position })
      .from(channelCategory)
      .where(eq(channelCategory.serverId, serverId))
      .orderBy(asc(channelCategory.position));
    return rows.length === 0 ? 0 : rows[rows.length - 1].position + 1;
  }

  private async requireMember(serverId: string, userId: string) {
    const [m] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);
    if (!m) throw new ForbiddenException('Not a member of this server');
  }

  private async requirePermission(serverId: string, userId: string, flag: number) {
    const authz = await this.rolesService.resolveAuthz(serverId, userId);
    if (authz.isOwner) return;
    if (!hasPermission(authz.permissions, flag)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
