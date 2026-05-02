import type { PluginManifest } from './manifest';

export interface CommandContext {
  serverId: string;
  channelId: string;
  userId: string;
  userName: string;
}

export type CommandHandler = (
  args: string[],
  ctx: CommandContext,
) => Promise<string | null> | string | null;

export type PlatformEvent =
  | 'player:joined'
  | 'player:left'
  | 'message:sent'
  | 'voice:joined'
  | 'voice:left'
  | 'world:object:clicked';

export interface WorldObjectSpec {
  id: string;
  x: number;
  y: number;
  texture: string;
  frame?: number | string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface UIPanelSpec {
  id: string;
  label: string;
  icon: string;
  component: string;
}

export interface PluginContext {
  readonly pluginId: string;
  readonly serverId: string;

  commands: {
    register(name: string, handler: CommandHandler): void;
  };

  events: {
    on(event: PlatformEvent, handler: (...args: unknown[]) => void): void;
  };

  storage: {
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };

  world: {
    spawnObject(spec: WorldObjectSpec): void;
    removeObject(id: string): void;
  };

  ui: {
    registerPanel(spec: UIPanelSpec): void;
  };

  scheduler: {
    every(ms: number, cb: () => void | Promise<void>): () => void;
  };

  broadcast: {
    emit(event: string, payload: unknown): void;
  };
}

export interface PluginDefinition {
  manifest: PluginManifest;
  initialize(ctx: PluginContext): void | Promise<void>;
}
