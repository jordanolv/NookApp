import { io, type Socket } from 'socket.io-client';
import {
  PLUGIN_ACTION_TYPES,
  PLUGIN_EVENT_TYPES,
  PLUGIN_PROTOCOL_VERSION,
  type ChannelViewUpdatePayload,
  type ChatSendPayload,
  type CommandInvokePayload,
  type ComponentTree,
  type HandshakeResponse,
  type InteractionDispatchPayload,
  type ModalClosePayload,
  type ModalOpenPayload,
  type NotifyPayload,
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

export interface CommandContext {
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

export class PluginClient {
  private socket: Socket | null = null;
  private pluginId: string | null = null;
  private enabledServerIds: string[] = [];

  private readonly commands = new Map<string, { def: SlashCommandDef; handler: CommandHandler }>();
  private readonly eventHandlers = new Map<PlatformEventName, Array<(payload: unknown) => void>>();
  private interactionHandler: InteractionHandler | null = null;
  private readonly pending = new Map<string, PendingResponse>();
  private nextRequestId = 1;

  constructor(private readonly options: PluginClientOptions) {}

  onCommand(def: SlashCommandDef, handler: CommandHandler): this {
    this.commands.set(def.name, { def, handler });
    return this;
  }

  onEvent<E extends PlatformEventName>(event: E, handler: EventHandler<E>): this {
    const list = this.eventHandlers.get(event) ?? [];
    list.push(handler as (payload: unknown) => void);
    this.eventHandlers.set(event, list);
    return this;
  }

  onInteraction(handler: InteractionHandler): this {
    this.interactionHandler = handler;
    return this;
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
          slashCommands: Array.from(this.commands.values()).map((c) => c.def),
          channelTypes: [],
          sidebarItems: [],
          events: Array.from(this.eventHandlers.keys()) as PlatformEventName[],
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
      const cmd = this.commands.get(p.commandName);
      if (!cmd) return;
      void cmd.handler(p.args, {
        serverId: p.serverId,
        channelId: p.channelId,
        userId: p.userId,
        userName: p.userName,
        interactionId: p.interactionId,
      });
      return;
    }

    if (type === PLUGIN_EVENT_TYPES.Interaction) {
      const p = payload as InteractionDispatchPayload;
      void this.interactionHandler?.(p);
      return;
    }

    const handlers = this.eventHandlers.get(type as PlatformEventName);
    if (!handlers) return;
    for (const h of handlers) h(payload);
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
