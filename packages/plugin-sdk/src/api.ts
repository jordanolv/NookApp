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

export type PlatformEvent = 'player:joined' | 'player:left' | 'message:sent';

export interface PluginContext {
  readonly pluginId: string;
  readonly serverId: string;

  commands: {
    register(name: string, handler: CommandHandler): void;
  };

  events: {
    on(event: PlatformEvent, handler: (...args: unknown[]) => void): void;
  };
}

export interface PluginDefinition {
  manifest: PluginManifest;
  initialize(ctx: PluginContext): void | Promise<void>;
}
