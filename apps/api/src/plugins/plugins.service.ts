import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type {
  PluginContext,
  PluginDefinition,
  CommandHandler,
  PlatformEvent,
} from '@nookapp/plugin-sdk';
import { serverPlugin, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';
import { PLUGIN_REGISTRY } from './plugin-registry';

class PluginContextImpl implements PluginContext {
  readonly pluginId: string;
  readonly serverId: string;

  private readonly commandHandlers = new Map<string, CommandHandler>();
  private readonly eventHandlers = new Map<PlatformEvent, ((...args: unknown[]) => void)[]>();

  constructor(pluginId: string, serverId: string) {
    this.pluginId = pluginId;
    this.serverId = serverId;
  }

  commands = {
    register: (name: string, handler: CommandHandler) => {
      this.commandHandlers.set(name.toLowerCase(), handler);
    },
  };

  events = {
    on: (event: PlatformEvent, handler: (...args: unknown[]) => void) => {
      const list = this.eventHandlers.get(event) ?? [];
      this.eventHandlers.set(event, [...list, handler]);
    },
  };

  getCommandHandler(name: string): CommandHandler | undefined {
    return this.commandHandlers.get(name.toLowerCase());
  }

  emit(event: PlatformEvent, ...args: unknown[]) {
    for (const handler of this.eventHandlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

@Injectable()
export class PluginsService implements OnModuleInit {
  // serverId:pluginId → context
  private readonly active = new Map<string, PluginContextImpl>();

  constructor(@Inject(DB) private readonly db: Database) {}

  async onModuleInit() {
    const rows = await this.db.select().from(serverPlugin).where(eq(serverPlugin.enabled, true));
    for (const row of rows) {
      await this.activate(row.serverId, row.pluginId);
    }
  }

  private contextKey(serverId: string, pluginId: string) {
    return `${serverId}:${pluginId}`;
  }

  private async activate(serverId: string, pluginId: string) {
    const def = PLUGIN_REGISTRY.find((p) => p.manifest.id === pluginId);
    if (!def) return;
    const ctx = new PluginContextImpl(pluginId, serverId);
    await def.initialize(ctx);
    this.active.set(this.contextKey(serverId, pluginId), ctx);
  }

  private deactivate(serverId: string, pluginId: string) {
    this.active.delete(this.contextKey(serverId, pluginId));
  }

  listAvailable(): PluginDefinition['manifest'][] {
    return PLUGIN_REGISTRY.map((p) => p.manifest);
  }

  async listForServer(serverId: string) {
    const rows = await this.db
      .select()
      .from(serverPlugin)
      .where(eq(serverPlugin.serverId, serverId));

    const enabledIds = new Set(rows.filter((r) => r.enabled).map((r) => r.pluginId));

    return PLUGIN_REGISTRY.map((p) => ({
      ...p.manifest,
      enabled: enabledIds.has(p.manifest.id),
    }));
  }

  async enable(serverId: string, pluginId: string) {
    const def = PLUGIN_REGISTRY.find((p) => p.manifest.id === pluginId);
    if (!def) throw new Error(`Unknown plugin: ${pluginId}`);

    await this.db
      .insert(serverPlugin)
      .values({ serverId, pluginId, enabled: true })
      .onConflictDoUpdate({
        target: [serverPlugin.serverId, serverPlugin.pluginId],
        set: { enabled: true },
      });

    await this.activate(serverId, pluginId);
  }

  async disable(serverId: string, pluginId: string) {
    await this.db
      .update(serverPlugin)
      .set({ enabled: false })
      .where(and(eq(serverPlugin.serverId, serverId), eq(serverPlugin.pluginId, pluginId)));

    this.deactivate(serverId, pluginId);
  }

  async handleCommand(
    serverId: string,
    channelId: string,
    command: string,
    args: string[],
    userId: string,
    userName: string,
  ): Promise<string | null> {
    for (const [key, ctx] of this.active) {
      if (!key.startsWith(`${serverId}:`)) continue;
      const handler = ctx.getCommandHandler(command);
      if (handler) {
        const result = await handler(args, { serverId, channelId, userId, userName });
        return result ?? null;
      }
    }
    return null;
  }

  emitEvent(serverId: string, event: PlatformEvent, ...args: unknown[]) {
    for (const [key, ctx] of this.active) {
      if (key.startsWith(`${serverId}:`)) {
        ctx.emit(event, ...args);
      }
    }
  }
}
