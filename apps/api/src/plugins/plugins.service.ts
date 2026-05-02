import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type {
  PluginContext,
  PluginDefinition,
  CommandHandler,
  PlatformEvent,
  WorldObjectSpec,
  UIPanelSpec,
} from '@nookapp/plugin-sdk';
import { serverPlugin, pluginKv, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';
import { PLUGIN_REGISTRY } from './plugin-registry';
import { RealtimeGateway } from '../realtime/realtime.gateway';

class PluginContextImpl implements PluginContext {
  readonly pluginId: string;
  readonly serverId: string;

  private readonly commandHandlers = new Map<string, CommandHandler>();
  private readonly eventHandlers = new Map<PlatformEvent, ((...args: unknown[]) => void)[]>();
  private readonly timers: ReturnType<typeof setInterval>[] = [];
  private readonly panels: UIPanelSpec[] = [];

  constructor(
    pluginId: string,
    serverId: string,
    private readonly db: Database,
    private readonly gateway: RealtimeGateway,
  ) {
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

  storage = {
    get: async <T = unknown>(key: string): Promise<T | null> => {
      const [row] = await this.db
        .select({ value: pluginKv.value })
        .from(pluginKv)
        .where(
          and(
            eq(pluginKv.serverId, this.serverId),
            eq(pluginKv.pluginId, this.pluginId),
            eq(pluginKv.key, key),
          ),
        )
        .limit(1);
      return row ? (row.value as T) : null;
    },

    set: async <T = unknown>(key: string, value: T): Promise<void> => {
      const jsonValue = value as unknown;
      await this.db
        .insert(pluginKv)
        .values({
          id: randomUUID(),
          serverId: this.serverId,
          pluginId: this.pluginId,
          key,
          value: jsonValue,
        })
        .onConflictDoUpdate({
          target: [pluginKv.serverId, pluginKv.pluginId, pluginKv.key],
          set: { value: jsonValue, updatedAt: new Date() },
        });
    },

    delete: async (key: string): Promise<void> => {
      await this.db
        .delete(pluginKv)
        .where(
          and(
            eq(pluginKv.serverId, this.serverId),
            eq(pluginKv.pluginId, this.pluginId),
            eq(pluginKv.key, key),
          ),
        );
    },
  };

  world = {
    spawnObject: (spec: WorldObjectSpec) => {
      this._worldObjects.set(spec.id, spec);
      this.gateway.emitToServer(this.serverId, 'world:object:spawn', {
        ...spec,
        pluginId: this.pluginId,
      });
    },

    removeObject: (id: string) => {
      this._worldObjects.delete(id);
      this.gateway.emitToServer(this.serverId, 'world:object:remove', { id });
    },
  };

  // Tracked so newly joining players receive a snapshot
  readonly _worldObjects = new Map<string, WorldObjectSpec>();

  ui = {
    registerPanel: (spec: UIPanelSpec) => {
      this.panels.push(spec);
    },
  };

  scheduler = {
    every: (ms: number, cb: () => void | Promise<void>): (() => void) => {
      const handle = setInterval(() => void cb(), ms);
      this.timers.push(handle);
      return () => clearInterval(handle);
    },
  };

  broadcast = {
    emit: (event: string, payload: unknown) => {
      this.gateway.emitToServer(this.serverId, event, payload);
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

  getRegisteredPanels(): UIPanelSpec[] {
    return this.panels;
  }

  destroy() {
    for (const t of this.timers) clearInterval(t);
    this.timers.length = 0;
  }
}

@Injectable()
export class PluginsService implements OnModuleInit {
  // serverId:pluginId → context
  private readonly active = new Map<string, PluginContextImpl>();

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(forwardRef(() => RealtimeGateway)) private readonly gateway: RealtimeGateway,
  ) {}

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
    const ctx = new PluginContextImpl(pluginId, serverId, this.db, this.gateway);
    await def.initialize(ctx);
    this.active.set(this.contextKey(serverId, pluginId), ctx);
  }

  private deactivate(serverId: string, pluginId: string) {
    const key = this.contextKey(serverId, pluginId);
    const ctx = this.active.get(key);
    if (ctx) {
      // Remove any world objects this plugin spawned
      for (const id of ctx._worldObjects.keys()) {
        this.gateway.emitToServer(serverId, 'world:object:remove', { id });
      }
      ctx.destroy();
    }
    this.active.delete(key);
  }

  getWorldObjects(serverId: string): WorldObjectSpec[] {
    const result: WorldObjectSpec[] = [];
    for (const [key, ctx] of this.active) {
      if (key.startsWith(`${serverId}:`)) {
        result.push(...ctx._worldObjects.values());
      }
    }
    return result;
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

    return PLUGIN_REGISTRY.map((p) => {
      const key = this.contextKey(serverId, p.manifest.id);
      const ctx = this.active.get(key);
      return {
        ...p.manifest,
        enabled: enabledIds.has(p.manifest.id),
        panels: ctx?.getRegisteredPanels() ?? [],
      };
    });
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

  handleWorldObjectClick(serverId: string, objectId: string, userId: string) {
    this.emitEvent(serverId, 'world:object:clicked', { objectId, userId });
  }
}
