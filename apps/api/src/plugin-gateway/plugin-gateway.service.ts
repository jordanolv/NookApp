import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Socket } from 'socket.io';
import type { PluginCapabilities } from '@nookapp/protocol';
import { pluginRegistration, serverPlugin, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';

const KEY_PREFIX = 'npk_';

interface ConnectedPlugin {
  pluginId: string;
  ownerUserId: string;
  socket: Socket;
  capabilities: PluginCapabilities;
}

@Injectable()
export class PluginGatewayService {
  private readonly connections = new Map<string, ConnectedPlugin>();

  constructor(@Inject(DB) private readonly db: Database) {}

  generateKey(): { raw: string; prefix: string; hash: string } {
    const raw = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
    return { raw, prefix: raw.slice(0, 12), hash: this.hashKey(raw) };
  }

  hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async findRegistrationByKey(rawKey: string) {
    if (!rawKey.startsWith(KEY_PREFIX)) return null;
    const hash = this.hashKey(rawKey);
    const [row] = await this.db
      .select()
      .from(pluginRegistration)
      .where(eq(pluginRegistration.apiKeyHash, hash))
      .limit(1);
    return row ?? null;
  }

  isConnected(pluginId: string): boolean {
    return this.connections.has(pluginId);
  }

  registerConnection(
    pluginId: string,
    ownerUserId: string,
    socket: Socket,
    capabilities: PluginCapabilities,
  ) {
    this.connections.set(pluginId, { pluginId, ownerUserId, socket, capabilities });
  }

  unregisterConnection(pluginId: string) {
    this.connections.delete(pluginId);
  }

  getConnection(pluginId: string): ConnectedPlugin | undefined {
    return this.connections.get(pluginId);
  }

  async getEnabledServerIds(pluginId: string): Promise<string[]> {
    const rows = await this.db
      .select({ serverId: serverPlugin.serverId })
      .from(serverPlugin)
      .where(and(eq(serverPlugin.pluginId, pluginId), eq(serverPlugin.enabled, true)));
    return rows.map((r) => r.serverId);
  }

  async markConnected(pluginId: string, capabilities: PluginCapabilities) {
    await this.db
      .update(pluginRegistration)
      .set({
        lastConnectedAt: new Date(),
        capabilities,
        updatedAt: new Date(),
      })
      .where(eq(pluginRegistration.id, pluginId));
  }
}
