import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import {
  channelViewUpdatePayloadSchema,
  chatSendPayloadSchema,
  handshakeRequestSchema,
  modalClosePayloadSchema,
  modalOpenPayloadSchema,
  notifyPayloadSchema,
  panelUpdatePayloadSchema,
  PLUGIN_ACTION_TYPES,
  PLUGIN_PROTOCOL_VERSION,
  storageDeletePayloadSchema,
  storageGetPayloadSchema,
  storageSetPayloadSchema,
  type HandshakeError,
  type HandshakeErrorCode,
  type HandshakeOk,
} from '@nookapp/protocol';
import { PluginGatewayService } from './plugin-gateway.service';

const HANDSHAKE_TIMEOUT_MS = 5_000;
const HANDSHAKE_RESULT_EVENT = 'handshake:result';

interface PluginSocketData {
  pluginId?: string;
  ownerUserId?: string;
  handshakeTimer?: ReturnType<typeof setTimeout>;
}

@WebSocketGateway({
  namespace: '/plugin-gateway',
  cors: { origin: true, credentials: true },
})
export class PluginGatewayWs implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PluginGatewayWs.name);

  constructor(private readonly service: PluginGatewayService) {}

  handleConnection(client: Socket) {
    const data = client.data as PluginSocketData;
    data.handshakeTimer = setTimeout(() => {
      if (!data.pluginId) {
        this.logger.debug(`plugin socket ${client.id} timed out without handshake`);
        client.disconnect(true);
      }
    }, HANDSHAKE_TIMEOUT_MS);
  }

  handleDisconnect(client: Socket) {
    const data = client.data as PluginSocketData;
    if (data.handshakeTimer) clearTimeout(data.handshakeTimer);
    if (data.pluginId) {
      this.service.unregisterConnection(data.pluginId);
      this.logger.log(`plugin ${data.pluginId} disconnected`);
    }
  }

  @SubscribeMessage('handshake')
  async handleHandshake(client: Socket, payload: unknown) {
    const parsed = handshakeRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return this.reject(client, 'invalid_manifest', parsed.error.message);
    }
    const { token, capabilities, protocolVersion } = parsed.data;

    if (protocolVersion !== PLUGIN_PROTOCOL_VERSION) {
      return this.reject(
        client,
        'protocol_mismatch',
        `expected protocol version ${PLUGIN_PROTOCOL_VERSION}`,
      );
    }

    const registration = await this.service.findRegistrationByKey(token);
    if (!registration || registration.status !== 'active') {
      return this.reject(client, 'invalid_token', 'invalid or disabled api key');
    }

    if (this.service.isConnected(registration.id)) {
      this.logger.log(`plugin ${registration.id} reconnecting — kicking previous socket`);
      this.service.kickExisting(registration.id);
    }

    const data = client.data as PluginSocketData;
    if (data.handshakeTimer) clearTimeout(data.handshakeTimer);
    data.pluginId = registration.id;
    data.ownerUserId = registration.ownerUserId;

    this.service.registerConnection(
      registration.id,
      registration.ownerUserId,
      registration.slug,
      registration.name,
      client,
      capabilities,
    );
    await this.service.markConnected(registration.id, capabilities);

    const enabledServerIds = await this.service.getEnabledServerIds(registration.id);
    const ok: HandshakeOk = {
      ok: true,
      pluginId: registration.id,
      enabledServerIds,
    };
    client.emit(HANDSHAKE_RESULT_EVENT, ok);
    this.logger.log(`plugin ${registration.id} (${registration.slug}) connected`);
  }

  @SubscribeMessage('action')
  async handleAction(client: Socket, payload: unknown) {
    const data = client.data as PluginSocketData;
    if (!data.pluginId) return;
    if (!isEnvelope(payload, 'action')) return;
    const { type, payload: body } = payload as { type: string; payload: unknown };

    switch (type) {
      case PLUGIN_ACTION_TYPES.ChatSend: {
        const parsed = chatSendPayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handleChatSend(data.pluginId, parsed.data);
        return;
      }
      case PLUGIN_ACTION_TYPES.ModalOpen: {
        const parsed = modalOpenPayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handleModalOpen(data.pluginId, parsed.data);
        return;
      }
      case PLUGIN_ACTION_TYPES.ModalClose: {
        const parsed = modalClosePayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handleModalClose(data.pluginId, parsed.data);
        return;
      }
      case PLUGIN_ACTION_TYPES.PanelUpdate: {
        const parsed = panelUpdatePayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handlePanelUpdate(data.pluginId, parsed.data);
        return;
      }
      case PLUGIN_ACTION_TYPES.ChannelViewUpdate: {
        const parsed = channelViewUpdatePayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handleChannelViewUpdate(data.pluginId, parsed.data);
        return;
      }
      case PLUGIN_ACTION_TYPES.Notify: {
        const parsed = notifyPayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handleNotify(data.pluginId, parsed.data);
        return;
      }
      case PLUGIN_ACTION_TYPES.StorageSet: {
        const parsed = storageSetPayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handleStorageSet(data.pluginId, parsed.data);
        return;
      }
      case PLUGIN_ACTION_TYPES.StorageDelete: {
        const parsed = storageDeletePayloadSchema.safeParse(body);
        if (parsed.success) await this.service.handleStorageDelete(data.pluginId, parsed.data);
        return;
      }
      default:
        this.logger.debug(`plugin ${data.pluginId} sent unsupported action: ${type}`);
    }
  }

  @SubscribeMessage('request')
  async handleRequest(client: Socket, payload: unknown) {
    const data = client.data as PluginSocketData;
    if (!data.pluginId) return;
    if (!isEnvelope(payload, 'request')) return;
    const { id, type, payload: body } = payload as { id: string; type: string; payload: unknown };

    try {
      if (type === PLUGIN_ACTION_TYPES.StorageGet) {
        const parsed = storageGetPayloadSchema.safeParse(body);
        if (!parsed.success) throw new Error('invalid payload');
        const result = await this.service.handleStorageGet(data.pluginId, parsed.data);
        client.emit('response', { kind: 'response', id, ok: true, result });
        return;
      }
      throw new Error(`unsupported request: ${type}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'request failed';
      client.emit('response', { kind: 'response', id, ok: false, error: message });
    }
  }

  private reject(client: Socket, code: HandshakeErrorCode, message: string) {
    const err: HandshakeError = { ok: false, code, message };
    client.emit(HANDSHAKE_RESULT_EVENT, err);
    client.disconnect(true);
  }
}

function isEnvelope(value: unknown, kind: 'action' | 'request'): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === kind &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}
