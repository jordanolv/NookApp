import { io, type Socket } from 'socket.io-client';
import {
  PLUGIN_ACTION_TYPES,
  PLUGIN_EVENT_TYPES,
  PLUGIN_PROTOCOL_VERSION,
  type ChannelTypeDef,
  type ChannelViewUpdatePayload,
  type ChatSendPayload,
  type CommandInvokePayload,
  type ComponentTree,
  type FeatureDef,
  type HandshakeResponse,
  type InteractionDispatchPayload,
  type MenuDef,
  type ModalClosePayload,
  type ModalOpenPayload,
  type NotifyPayload,
  type PanelOpenedPayload,
  type PanelUpdatePayload,
  type PlatformEventName,
  type PluginCapabilities,
  type PluginMessageSentPayload,
  type PlayerJoinedPayload,
  type PlayerLeftPayload,
  type SlashCommandDef,
  type VoiceChangePayload,
  type WorldObjectClickedPayload,
} from '@nookapp/protocol';

export interface PluginClientOptions {
  token: string;
  url?: string;
  name?: string;
  version?: string;
  description?: string;
}

export interface FeatureInfo {
  name: string;
  icon: string;
  description?: string;
}

export interface CommandContext {
  featureId: string;
  serverId: string;
  channelId: string;
  userId: string;
  userName: string;
  interactionId: string;
}

export type CommandHandler = (
  args: Record<string, unknown>,
  ctx: CommandContext,
) => void | Promise<void>;

export interface MenuOpenContext {
  featureId: string;
  menuId: string;
  serverId: string;
  userId: string;
}

export type MenuOpenHandler = (ctx: MenuOpenContext) => void | Promise<void>;

export type PlatformEventPayloadMap = {
  'player:joined': PlayerJoinedPayload;
  'player:left': PlayerLeftPayload;
  'message:sent': PluginMessageSentPayload;
  'voice:joined': VoiceChangePayload;
  'voice:left': VoiceChangePayload;
  'world-object:clicked': WorldObjectClickedPayload;
};

export type EventHandler<E extends PlatformEventName> = (
  payload: PlatformEventPayloadMap[E],
) => void | Promise<void>;

export type InteractionHandler = (payload: InteractionDispatchPayload) => void | Promise<void>;

type PendingResponse = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const DEFAULT_URL = 'http://localhost:3000/plugin-gateway';
const REQUEST_TIMEOUT_MS = 5_000;

class FeatureBuilder {
  readonly id: string;
  readonly info: FeatureInfo;
  readonly commands = new Map<string, { def: SlashCommandDef; handler: CommandHandler }>();
  readonly menus: MenuDef[] = [];
  readonly menuHandlers = new Map<string, MenuOpenHandler>();
  readonly events = new Map<PlatformEventName, Array<(payload: unknown) => void>>();
  readonly channelTypes: ChannelTypeDef[] = [];
  interactionHandler: InteractionHandler | null = null;

  constructor(id: string, info: FeatureInfo) {
    this.id = id;
    this.info = info;
  }

  addCommand(def: SlashCommandDef, handler: CommandHandler): this {
    this.commands.set(def.name, { def, handler });
    return this;
  }

  addMenu(def: MenuDef, handler?: MenuOpenHandler): this {
    this.menus.push(def);
    if (handler) this.menuHandlers.set(def.id, handler);
    return this;
  }

  onMenuOpen(menuId: string, handler: MenuOpenHandler): this {
    this.menuHandlers.set(menuId, handler);
    return this;
  }

  addChannelType(def: ChannelTypeDef): this {
    this.channelTypes.push(def);
    return this;
  }

  onEvent<E extends PlatformEventName>(event: E, handler: EventHandler<E>): this {
    const list = this.events.get(event) ?? [];
    list.push(handler as (payload: unknown) => void);
    this.events.set(event, list);
    return this;
  }

  onInteraction(handler: InteractionHandler): this {
    this.interactionHandler = handler;
    return this;
  }

  toDef(): FeatureDef {
    return {
      id: this.id,
      name: this.info.name,
      icon: this.info.icon,
      description: this.info.description,
      slashCommands: Array.from(this.commands.values()).map((c) => c.def),
      menus: [...this.menus],
      events: Array.from(this.events.keys()),
      channelTypes: [...this.channelTypes],
    };
  }
}

export class PluginClient {
  private socket: Socket | null = null;
  private pluginId: string | null = null;
  private enabledServerIds: string[] = [];

  private readonly features = new Map<string, FeatureBuilder>();
  private readonly pending = new Map<string, PendingResponse>();
  private nextRequestId = 1;

  constructor(private readonly options: PluginClientOptions) {}

  feature(id: string, info: FeatureInfo): FeatureBuilder {
    let f = this.features.get(id);
    if (!f) {
      f = new FeatureBuilder(id, info);
      this.features.set(id, f);
    }
    return f;
  }

  async connect(): Promise<{ pluginId: string; enabledServerIds: string[] }> {
    if (this.socket) throw new Error('already connected');
    const url = this.options.url ?? DEFAULT_URL;
    const socket = io(url, { transports: ['websocket'], reconnection: false });
    this.socket = socket;

    socket.on('event', (env: unknown) => this.handleEvent(env));
    socket.on('response', (env: unknown) => this.handleResponse(env));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('handshake timeout'));
      }, 5_000);

      socket.once('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      socket.once('handshake:result', (res: HandshakeResponse) => {
        clearTimeout(timeout);
        if (!res.ok) {
          socket.close();
          reject(new Error(`handshake failed: ${res.code} — ${res.message}`));
          return;
        }
        this.pluginId = res.pluginId;
        this.enabledServerIds = res.enabledServerIds;
        resolve({ pluginId: res.pluginId, enabledServerIds: res.enabledServerIds });
      });

      socket.once('connect', () => {
        const capabilities: PluginCapabilities = {
          features: Array.from(this.features.values()).map((f) => f.toDef()),
        };
        socket.emit('handshake', {
          protocolVersion: PLUGIN_PROTOCOL_VERSION,
          token: this.options.token,
          plugin: {
            id: this.options.name ?? 'plugin',
            version: this.options.version ?? '0.0.0',
            displayName: this.options.name ?? 'plugin',
            description: this.options.description,
          },
          capabilities,
        });
      });
    });
  }

  disconnect() {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('client disconnected'));
    }
    this.pending.clear();
    this.socket?.close();
    this.socket = null;
    this.pluginId = null;
  }

  sendChat(payload: ChatSendPayload) {
    this.sendAction(PLUGIN_ACTION_TYPES.ChatSend, payload);
  }

  openModal(payload: ModalOpenPayload) {
    this.sendAction(PLUGIN_ACTION_TYPES.ModalOpen, payload);
  }

  closeModal(payload: ModalClosePayload) {
    this.sendAction(PLUGIN_ACTION_TYPES.ModalClose, payload);
  }

  updatePanel(payload: PanelUpdatePayload) {
    this.sendAction(PLUGIN_ACTION_TYPES.PanelUpdate, payload);
  }

  updateChannelView(payload: ChannelViewUpdatePayload) {
    this.sendAction(PLUGIN_ACTION_TYPES.ChannelViewUpdate, payload);
  }

  notify(payload: NotifyPayload) {
    this.sendAction(PLUGIN_ACTION_TYPES.Notify, payload);
  }

  readonly storage = {
    get: <T = unknown>(serverId: string, key: string): Promise<T | null> =>
      this.request<T | null>(PLUGIN_ACTION_TYPES.StorageGet, { serverId, key }),
    set: (serverId: string, key: string, value: unknown): void => {
      this.sendAction(PLUGIN_ACTION_TYPES.StorageSet, { serverId, key, value });
    },
    delete: (serverId: string, key: string): void => {
      this.sendAction(PLUGIN_ACTION_TYPES.StorageDelete, { serverId, key });
    },
  };

  get id(): string | null {
    return this.pluginId;
  }

  get servers(): readonly string[] {
    return this.enabledServerIds;
  }

  private sendAction(type: string, payload: unknown) {
    if (!this.socket) throw new Error('not connected');
    this.socket.emit('action', { kind: 'action', type, payload });
  }

  private request<T>(type: string, payload: unknown): Promise<T> {
    if (!this.socket) throw new Error('not connected');
    const id = `req-${this.nextRequestId++}`;
    const socket = this.socket;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`request ${type} timed out`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      socket.emit('request', { kind: 'request', id, type, payload });
    });
  }

  private handleEvent(envelope: unknown) {
    if (!isEventEnvelope(envelope)) return;
    const { type, payload } = envelope;

    if (type === PLUGIN_EVENT_TYPES.CommandInvoke) {
      const p = payload as CommandInvokePayload;
      const feature = this.features.get(p.featureId);
      const cmd = feature?.commands.get(p.commandName);
      if (!cmd) return;
      void cmd.handler(p.args, {
        featureId: p.featureId,
        serverId: p.serverId,
        channelId: p.channelId,
        userId: p.userId,
        userName: p.userName,
        interactionId: p.interactionId,
      });
      return;
    }

    if (type === PLUGIN_EVENT_TYPES.PanelOpened) {
      const p = payload as PanelOpenedPayload;
      const feature = this.features.get(p.featureId);
      const handler = feature?.menuHandlers.get(p.menuId);
      if (!handler) return;
      void handler({
        featureId: p.featureId,
        menuId: p.menuId,
        serverId: p.serverId,
        userId: p.userId,
      });
      return;
    }

    if (type === PLUGIN_EVENT_TYPES.Interaction) {
      const p = payload as InteractionDispatchPayload;
      if (p.featureId) {
        const feature = this.features.get(p.featureId);
        void feature?.interactionHandler?.(p);
      } else {
        for (const f of this.features.values()) void f.interactionHandler?.(p);
      }
      return;
    }

    for (const feature of this.features.values()) {
      const handlers = feature.events.get(type as PlatformEventName);
      if (!handlers) continue;
      for (const h of handlers) h(payload);
    }
  }

  private handleResponse(envelope: unknown) {
    if (!isResponseEnvelope(envelope)) return;
    const p = this.pending.get(envelope.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(envelope.id);
    if (envelope.ok) p.resolve(envelope.result);
    else p.reject(new Error(envelope.error));
  }
}

export function createPlugin(options: PluginClientOptions): PluginClient {
  return new PluginClient(options);
}

function isEventEnvelope(value: unknown): value is { type: string; payload: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'event' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

function isResponseEnvelope(
  value: unknown,
): value is { id: string; ok: true; result: unknown } | { id: string; ok: false; error: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'response' &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

export type { ComponentTree };
