import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { pluginRegistration, serverPlugin, server, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';
import { PluginGatewayService } from './plugin-gateway.service';

@Injectable()
export class ServerPluginsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly gateway: PluginGatewayService,
  ) {}

  async listForServer(serverId: string, userId: string) {
    await this.requireServerOwner(serverId, userId);

    const myPlugins = await this.db
      .select()
      .from(pluginRegistration)
      .where(eq(pluginRegistration.ownerUserId, userId))
      .orderBy(desc(pluginRegistration.createdAt));

    const installs = await this.db
      .select({ pluginId: serverPlugin.pluginId, enabled: serverPlugin.enabled })
      .from(serverPlugin)
      .where(eq(serverPlugin.serverId, serverId));
    const installed = new Map(installs.map((r) => [r.pluginId, r.enabled]));

    return myPlugins.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      iconUrl: p.iconUrl,
      apiKeyPrefix: p.apiKeyPrefix,
      status: p.status,
      capabilities: p.capabilities,
      installed: installed.has(p.id) && installed.get(p.id) === true,
      connected: this.gateway.isConnected(p.id),
    }));
  }

  async install(serverId: string, pluginId: string, userId: string) {
    await this.requireServerOwner(serverId, userId);
    await this.requirePluginOwner(pluginId, userId);

    await this.db
      .insert(serverPlugin)
      .values({ serverId, pluginId, enabled: true })
      .onConflictDoUpdate({
        target: [serverPlugin.serverId, serverPlugin.pluginId],
        set: { enabled: true },
      });
  }

  async uninstall(serverId: string, pluginId: string, userId: string) {
    await this.requireServerOwner(serverId, userId);

    await this.db
      .delete(serverPlugin)
      .where(and(eq(serverPlugin.serverId, serverId), eq(serverPlugin.pluginId, pluginId)));
  }

  private async requireServerOwner(serverId: string, userId: string) {
    const [srv] = await this.db
      .select({ ownerId: server.ownerId })
      .from(server)
      .where(eq(server.id, serverId))
      .limit(1);
    if (!srv) throw new NotFoundException('Server not found');
    if (srv.ownerId !== userId)
      throw new ForbiddenException('Only the server owner can manage plugins');
  }

  private async requirePluginOwner(pluginId: string, userId: string) {
    const [row] = await this.db
      .select({ ownerUserId: pluginRegistration.ownerUserId })
      .from(pluginRegistration)
      .where(eq(pluginRegistration.id, pluginId))
      .limit(1);
    if (!row) throw new NotFoundException('Plugin not found');
    if (row.ownerUserId !== userId) {
      throw new ForbiddenException('You do not own this plugin');
    }
  }
}
