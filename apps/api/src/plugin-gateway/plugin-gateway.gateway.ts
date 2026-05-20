import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import {
  handshakeRequestSchema,
  PLUGIN_PROTOCOL_VERSION,
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
      return this.reject(client, 'already_connected', 'another instance is already connected');
    }

    const data = client.data as PluginSocketData;
    if (data.handshakeTimer) clearTimeout(data.handshakeTimer);
    data.pluginId = registration.id;
    data.ownerUserId = registration.ownerUserId;

    this.service.registerConnection(
      registration.id,
      registration.ownerUserId,
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

  private reject(client: Socket, code: HandshakeErrorCode, message: string) {
    const err: HandshakeError = { ok: false, code, message };
    client.emit(HANDSHAKE_RESULT_EVENT, err);
    client.disconnect(true);
  }
}
