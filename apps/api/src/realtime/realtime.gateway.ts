import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type {
  PlayerHelloPayload,
  PlayerMovedPayload,
  PlayerSnapshotPayload,
  PlayerState,
  VoiceParticipant,
  VoiceSnapshotPayload,
} from '@nookapp/protocol';
import { AuthService } from '../auth/auth.service';
import { PluginsService } from '../plugins/plugins.service';

type RoomPlayers = Map<string, PlayerState>;

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly rooms = new Map<string, RoomPlayers>();
  // serverId → Map<userId, channelId>
  private readonly voicePresence = new Map<string, Map<string, string>>();

  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => PluginsService)) private readonly plugins: PluginsService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth['token'] as string | undefined;
    const headers = token ? { authorization: `Bearer ${token}` } : client.handshake.headers;

    const session = await this.authService.getSession(headers as Record<string, string>);
    if (!session) {
      client.disconnect(true);
      return;
    }
    client.data.userId = session.user.id;
    client.data.name = session.user.name;
  }

  handleDisconnect(client: Socket) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    this.rooms.get(serverId)?.delete(userId);
    client.to(`server:${serverId}`).emit('player:left', { userId });
    this.plugins.emitEvent(serverId, 'player:left', { userId });

    const vp = this.voicePresence.get(serverId);
    const channelId = vp?.get(userId);
    if (vp && channelId) {
      vp.delete(userId);
      this.server.to(`server:${serverId}`).emit('voice:left', { userId, channelId });
      this.plugins.emitEvent(serverId, 'voice:left', { userId, channelId });
    }
  }

  @SubscribeMessage('player:hello')
  handlePlayerHello(client: Socket, payload: PlayerHelloPayload) {
    const { serverId, name, x, y, dir } = payload;
    const userId = client.data.userId as string;

    client.join(`server:${serverId}`);
    client.data.serverId = serverId;
    client.data.name = name;

    if (!this.rooms.has(serverId)) this.rooms.set(serverId, new Map());
    const room = this.rooms.get(serverId)!;

    const me: PlayerState = { userId, name, x, y, dir };
    const snapshot: PlayerSnapshotPayload = {
      you: me,
      others: Array.from(room.values()).filter((p) => p.userId !== userId),
    };
    client.emit('player:snapshot', snapshot);

    room.set(userId, me);
    client.to(`server:${serverId}`).emit('player:joined', me);
    this.plugins.emitEvent(serverId, 'player:joined', me);

    // Send world objects snapshot to the newcomer so objects spawned before they joined are visible
    const worldObjects = this.plugins.getWorldObjects(serverId);
    if (worldObjects.length) {
      client.emit('world:object:snapshot', { objects: worldObjects });
    }

    // Send current voice presence snapshot to the newcomer
    const vp = this.voicePresence.get(serverId);
    const voiceParticipants: VoiceParticipant[] = [];
    if (vp) {
      for (const [uid, chId] of vp.entries()) {
        const state = room.get(uid);
        if (state) voiceParticipants.push({ userId: uid, name: state.name, channelId: chId });
      }
    }
    const voiceSnapshot: VoiceSnapshotPayload = { participants: voiceParticipants };
    client.emit('voice:snapshot', voiceSnapshot);
  }

  @SubscribeMessage('player:moved')
  handlePlayerMoved(client: Socket, payload: PlayerMovedPayload) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    payload.userId = userId;

    const room = this.rooms.get(serverId);
    if (room?.has(userId)) {
      const prev = room.get(userId)!;
      room.set(userId, { ...prev, x: payload.x, y: payload.y, dir: payload.dir });
    }

    client.volatile.to(`server:${serverId}`).emit('player:moved', payload);
  }

  @SubscribeMessage('voice:join')
  handleVoiceJoin(client: Socket, payload: { channelId: string }) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    const name = client.data.name as string | undefined;
    if (!serverId || !userId || !name) return;

    if (!this.voicePresence.has(serverId)) this.voicePresence.set(serverId, new Map());
    const vp = this.voicePresence.get(serverId)!;

    const prevChannel = vp.get(userId);
    if (prevChannel && prevChannel !== payload.channelId) {
      this.server.to(`server:${serverId}`).emit('voice:left', { userId, channelId: prevChannel });
      this.plugins.emitEvent(serverId, 'voice:left', { userId, channelId: prevChannel });
    }

    vp.set(userId, payload.channelId);
    this.server
      .to(`server:${serverId}`)
      .emit('voice:joined', { userId, name, channelId: payload.channelId });
    this.plugins.emitEvent(serverId, 'voice:joined', {
      userId,
      name,
      channelId: payload.channelId,
    });
  }

  @SubscribeMessage('voice:leave')
  handleVoiceLeave(client: Socket) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    const vp = this.voicePresence.get(serverId);
    const channelId = vp?.get(userId);
    if (!vp || !channelId) return;

    vp.delete(userId);
    this.server.to(`server:${serverId}`).emit('voice:left', { userId, channelId });
    this.plugins.emitEvent(serverId, 'voice:left', { userId, channelId });
  }

  @SubscribeMessage('world:object:click')
  handleWorldObjectClick(client: Socket, payload: { objectId: string }) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    this.plugins.handleWorldObjectClick(serverId, payload.objectId, userId);
  }

  emitToServer(serverId: string, event: string, payload: unknown) {
    this.server.to(`server:${serverId}`).emit(event, payload);
  }
}
