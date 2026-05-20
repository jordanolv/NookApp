import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { CreatePluginRegistrationInput } from '@nookapp/protocol';
import { pluginRegistration, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';
import { PluginGatewayService } from './plugin-gateway.service';

@Injectable()
export class PluginRegistrationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly gateway: PluginGatewayService,
  ) {}

  async create(ownerUserId: string, input: CreatePluginRegistrationInput) {
    const id = randomUUID();
    const slug = await this.generateUniqueSlug(input.name);
    const { raw, prefix, hash } = this.gateway.generateKey();

    const [row] = await this.db
      .insert(pluginRegistration)
      .values({
        id,
        ownerUserId,
        slug,
        name: input.name,
        description: input.description,
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
      })
      .returning();

    if (!row) throw new ConflictException('Failed to create plugin registration');

    return {
      registration: this.toPublic(row),
      apiKey: raw,
    };
  }

  async listByOwner(ownerUserId: string) {
    const rows = await this.db
      .select()
      .from(pluginRegistration)
      .where(eq(pluginRegistration.ownerUserId, ownerUserId))
      .orderBy(desc(pluginRegistration.createdAt));
    return rows.map((row) => ({
      ...this.toPublic(row),
      connected: this.gateway.isConnected(row.id),
    }));
  }

  private toPublic(row: typeof pluginRegistration.$inferSelect) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      iconUrl: row.iconUrl,
      apiKeyPrefix: row.apiKeyPrefix,
      status: row.status,
      capabilities: row.capabilities,
      createdAt: row.createdAt,
      lastConnectedAt: row.lastConnectedAt,
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'plugin';

    let candidate = base;
    for (let attempt = 0; attempt < 6; attempt++) {
      if (!(await this.slugTaken(candidate))) return candidate;
      candidate = `${base}-${randomBytes(2).toString('hex')}`;
    }
    throw new ConflictException('Could not generate unique slug');
  }

  private async slugTaken(slug: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: pluginRegistration.id })
      .from(pluginRegistration)
      .where(eq(pluginRegistration.slug, slug))
      .limit(1);
    return !!row;
  }
}
