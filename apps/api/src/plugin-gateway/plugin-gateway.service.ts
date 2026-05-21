import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Socket } from 'socket.io';
import type {
  ChannelViewUpdatePayload,
  ChatSendPayload,
  InteractionDispatchPayload,
  ModalClosePayload,
  ModalOpenPayload,
  NotifyPayload,
  PanelUpdatePayload,
  PlatformEventName,
  PluginCapabilities,
  SlashCommandDef,
  StorageDeletePayload,
  StorageGetPayload,
  StorageSetPayload,
} from '@nookapp/protocol';
import { pluginKv, pluginRegistration, serverPlugin, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const KEY_PREFIX = 'npk_';

interface ConnectedPlugin {
  pluginId: string;
  ownerUserId: string;
  slug: string;
  name: string;
  socket: Socket;
  capabilities: PluginCapabilities;
}

interface SurfaceOwner {
  pluginId: string;
  serverId: string;
  channelId?: string;
}

@Injectable()
export class PluginGatewayService {
  private readonly logger = new Logger(PluginGatewayService.name);
  private readonly connections = new Map<string, ConnectedPlugin>();
  private readonly surfaceOwners = new Map<string, SurfaceOwner>();

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(forwardRef(() => RealtimeGateway)) private readonly realtime: RealtimeGateway,
  ) {}

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

  kickExisting(pluginId: string) {
    const existing = this.connections.get(pluginId);
    if (!existing) return;
    existing.socket.disconnect(true);
    this.connections.delete(pluginId);
  }

  registerConnection(
    pluginId: string,
    ownerUserId: string,
    slug: string,
    name: string,
    socket: Socket,
    capabilities: PluginCapabilities,
  ) {
    this.connections.set(pluginId, { pluginId, ownerUserId, slug, name, socket, capabilities });
  }

  unregisterConnection(pluginId: string) {
    this.connections.delete(pluginId);
    for (const [surfaceId, owner] of this.surfaceOwners) {
      if (owner.pluginId === pluginId) this.surfaceOwners.delete(surfaceId);
    }
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

  async dispatchEvent(serverId: string, eventType: PlatformEventName, payload: unknown) {
    const targets = await this.enabledConnections(serverId);
    for (const conn of targets) {
      if (!conn.capabilities.events.includes(eventType)) continue;
      conn.socket.emit('event', { kind: 'event', type: eventType, payload });
    }
  }

  async dispatchCommand(
    serverId: string,
    channelId: string,
    commandName: string,
    rawArgs: string[],
    userId: string,
    userName: string,
  ): Promise<boolean> {
    const targets = await this.enabledConnections(serverId);
    for (const conn of targets) {
      const def = conn.capabilities.slashCommands.find((c) => c.name === commandName);
      if (!def) continue;
      const args = parseSlashArgs(def, rawArgs);
      conn.socket.emit('event', {
        kind: 'event',
        type: 'command:invoke',
        payload: {
          commandName,
          args,
          serverId,
          channelId,
          userId,
          userName,
          interactionId: randomUUID(),
        },
      });
      return true;
    }
    return false;
  }

  async handleModalOpen(pluginId: string, payload: ModalOpenPayload) {
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) return;
    this.surfaceOwners.set(payload.modalId, {
      pluginId,
      serverId: payload.serverId,
      channelId: payload.channelId,
    });
    this.realtime.emitToUser(payload.userId, 'plugin:modal:open', {
      pluginId,
      modalId: payload.modalId,
      serverId: payload.serverId,
      title: payload.title,
      children: payload.children,
      submitLabel: payload.submitLabel,
      cancelLabel: payload.cancelLabel,
    });
  }

  async handleModalClose(pluginId: string, payload: ModalClosePayload) {
    const owner = this.surfaceOwners.get(payload.modalId);
    if (!owner || owner.pluginId !== pluginId) return;
    this.surfaceOwners.delete(payload.modalId);
    this.realtime.emitToUser(payload.userId, 'plugin:modal:close', { modalId: payload.modalId });
  }

  async handlePanelUpdate(pluginId: string, payload: PanelUpdatePayload) {
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) return;
    const surfaceId = `panel:${pluginId}:${payload.sidebarItemId}`;
    this.surfaceOwners.set(surfaceId, { pluginId, serverId: payload.serverId });
    const event = {
      pluginId,
      sidebarItemId: payload.sidebarItemId,
      serverId: payload.serverId,
      children: payload.children,
    };
    if (payload.userId) {
      this.realtime.emitToUser(payload.userId, 'plugin:panel:update', event);
    } else {
      this.realtime.emitToServer(payload.serverId, 'plugin:panel:update', event);
    }
  }

  async handleChannelViewUpdate(pluginId: string, payload: ChannelViewUpdatePayload) {
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) return;
    const surfaceId = `channel-view:${payload.channelId}`;
    this.surfaceOwners.set(surfaceId, { pluginId, serverId: payload.serverId });
    this.realtime.emitToServer(payload.serverId, 'plugin:channel-view:update', {
      pluginId,
      channelId: payload.channelId,
      children: payload.children,
    });
  }

  async handleNotify(pluginId: string, payload: NotifyPayload) {
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) return;
    this.realtime.emitToUser(payload.userId, 'plugin:notify', {
      pluginId,
      content: payload.content,
    });
  }

  async notifyPanelOpened(payload: {
    pluginId: string;
    sidebarItemId: string;
    serverId: string;
    userId: string;
  }) {
    if (!(await this.isEnabledForServer(payload.pluginId, payload.serverId))) return;
    const conn = this.connections.get(payload.pluginId);
    if (!conn) return;
    conn.socket.emit('event', {
      kind: 'event',
      type: 'panel:opened',
      payload: {
        serverId: payload.serverId,
        sidebarItemId: payload.sidebarItemId,
        userId: payload.userId,
      },
    });
  }

  async dispatchInteraction(payload: InteractionDispatchPayload) {
    const owner = this.surfaceOwners.get(payload.surfaceId);
    if (!owner) return;
    if (owner.serverId !== payload.serverId) return;
    if (!(await this.isEnabledForServer(owner.pluginId, payload.serverId))) return;
    const conn = this.connections.get(owner.pluginId);
    if (!conn) return;
    conn.socket.emit('event', {
      kind: 'event',
      type: 'interaction:dispatch',
      payload: { ...payload, channelId: payload.channelId ?? owner.channelId },
    });
  }

  async handleChatSend(pluginId: string, payload: ChatSendPayload) {
    const conn = this.connections.get(pluginId);
    if (!conn) return;
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) {
      this.logger.warn(
        `plugin ${pluginId} tried chat:send to unauthorized server ${payload.serverId}`,
      );
      return;
    }
    this.realtime.emitToServer(payload.serverId, 'message:sent', {
      id: `bot-${randomUUID()}`,
      channelId: payload.channelId,
      authorId: `plugin:${conn.slug}`,
      content: payload.content,
      createdAt: new Date().toISOString(),
      editedAt: null,
    });
  }

  async handleStorageGet(pluginId: string, payload: StorageGetPayload): Promise<unknown> {
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) return null;
    const [row] = await this.db
      .select({ value: pluginKv.value })
      .from(pluginKv)
      .where(
        and(
          eq(pluginKv.serverId, payload.serverId),
          eq(pluginKv.pluginId, pluginId),
          eq(pluginKv.key, payload.key),
        ),
      )
      .limit(1);
    return row?.value ?? null;
  }

  async handleStorageSet(pluginId: string, payload: StorageSetPayload) {
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) return;
    await this.db
      .insert(pluginKv)
      .values({
        id: randomUUID(),
        serverId: payload.serverId,
        pluginId,
        key: payload.key,
        value: payload.value as unknown,
      })
      .onConflictDoUpdate({
        target: [pluginKv.serverId, pluginKv.pluginId, pluginKv.key],
        set: { value: payload.value as unknown, updatedAt: new Date() },
      });
  }

  async handleStorageDelete(pluginId: string, payload: StorageDeletePayload) {
    if (!(await this.isEnabledForServer(pluginId, payload.serverId))) return;
    await this.db
      .delete(pluginKv)
      .where(
        and(
          eq(pluginKv.serverId, payload.serverId),
          eq(pluginKv.pluginId, pluginId),
          eq(pluginKv.key, payload.key),
        ),
      );
  }

  private async isEnabledForServer(pluginId: string, serverId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ enabled: serverPlugin.enabled })
      .from(serverPlugin)
      .where(and(eq(serverPlugin.pluginId, pluginId), eq(serverPlugin.serverId, serverId)))
      .limit(1);
    return row?.enabled === true;
  }

  private async enabledConnections(serverId: string): Promise<ConnectedPlugin[]> {
    const rows = await this.db
      .select({ pluginId: serverPlugin.pluginId })
      .from(serverPlugin)
      .where(and(eq(serverPlugin.serverId, serverId), eq(serverPlugin.enabled, true)));
    const out: ConnectedPlugin[] = [];
    for (const { pluginId } of rows) {
      const conn = this.connections.get(pluginId);
      if (conn) out.push(conn);
    }
    return out;
  }
}

function parseSlashArgs(def: SlashCommandDef, raw: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { _raw: raw };
  const options = def.options ?? [];
  options.forEach((opt, idx) => {
    const v = raw[idx];
    if (v === undefined) return;
    if (opt.type === 'number') out[opt.name] = Number(v);
    else if (opt.type === 'boolean') out[opt.name] = v === 'true';
    else out[opt.name] = v;
  });
  return out;
}
