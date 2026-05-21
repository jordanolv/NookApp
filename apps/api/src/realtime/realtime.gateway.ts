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
  PlayerAppearancePayload,
  PlayerHelloPayload,
  PlayerMovedPayload,
  PlayerSnapshotPayload,
  PlayerState,
  VoiceParticipant,
  VoiceSnapshotPayload,
} from '@nookapp/protocol';
import { AuthService } from '../auth/auth.service';
import { PluginGatewayService } from '../plugin-gateway/plugin-gateway.service';
import { MembersService } from '../members/members.service';

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
    @Inject(forwardRef(() => PluginGatewayService))
    private readonly pluginGateway: PluginGatewayService,
    private readonly members: MembersService,
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
    client.join(`user:${session.user.id}`);
  }

  handleDisconnect(client: Socket) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    const last = this.rooms.get(serverId)?.get(userId);
    if (last) {
      void this.members.updateLastPosition(serverId, userId, last.x, last.y).catch(() => undefined);
    }

    this.rooms.get(serverId)?.delete(userId);
    client.to(`server:${serverId}`).emit('player:left', { userId });
    void this.pluginGateway.dispatchEvent(serverId, 'player:left', { serverId, userId });

    const vp = this.voicePresence.get(serverId);
    const channelId = vp?.get(userId);
    if (vp && channelId) {
      vp.delete(userId);
      this.server.to(`server:${serverId}`).emit('voice:left', { userId, channelId });
      void this.pluginGateway.dispatchEvent(serverId, 'voice:left', {
        serverId,
        channelId,
        userId,
      });
    }
  }

  @SubscribeMessage('player:hello')
  async handlePlayerHello(client: Socket, payload: PlayerHelloPayload) {
    const { serverId, name, dir, appearance } = payload;
    let { x, y } = payload;
    const userId = client.data.userId as string;

    client.join(`server:${serverId}`);
    client.data.serverId = serverId;
    client.data.name = name;

    const saved = await this.members.getLastPosition(serverId, userId).catch(() => null);
    if (saved) {
      x = saved.x;
      y = saved.y;
    }

    if (!this.rooms.has(serverId)) this.rooms.set(serverId, new Map());
    const room = this.rooms.get(serverId)!;

    const me: PlayerState = { userId, name, x, y, dir, appearance };
    const snapshot: PlayerSnapshotPayload = {
      you: me,
      others: Array.from(room.values()).filter((p) => p.userId !== userId),
    };
    client.emit('player:snapshot', snapshot);

    room.set(userId, me);
    client.to(`server:${serverId}`).emit('player:joined', me);
    void this.pluginGateway.dispatchEvent(serverId, 'player:joined', {
      serverId,
      userId,
      userName: name,
    });

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

  @SubscribeMessage('player:appearance')
  handlePlayerAppearance(
    client: Socket,
    payload: { appearance: PlayerAppearancePayload['appearance'] },
  ) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    const room = this.rooms.get(serverId);
    const prev = room?.get(userId);
    if (room && prev) {
      room.set(userId, { ...prev, appearance: payload.appearance });
    }

    const out: PlayerAppearancePayload = { userId, appearance: payload.appearance };
    client.to(`server:${serverId}`).emit('player:appearance', out);
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
      void this.pluginGateway.dispatchEvent(serverId, 'voice:left', {
        serverId,
        channelId: prevChannel,
        userId,
      });
    }

    vp.set(userId, payload.channelId);
    this.server
      .to(`server:${serverId}`)
      .emit('voice:joined', { userId, name, channelId: payload.channelId });
    void this.pluginGateway.dispatchEvent(serverId, 'voice:joined', {
      serverId,
      channelId: payload.channelId,
      userId,
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
    void this.pluginGateway.dispatchEvent(serverId, 'voice:left', {
      serverId,
      channelId,
      userId,
    });
  }

  @SubscribeMessage('world:object:click')
  handleWorldObjectClick(client: Socket, payload: { objectId: string }) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    void this.pluginGateway.dispatchEvent(serverId, 'world-object:clicked', {
      serverId,
      objectId: payload.objectId,
      userId,
    });
  }

  emitToServer(serverId: string, event: string, payload: unknown) {
    this.server.to(`server:${serverId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  @SubscribeMessage('plugin:panel:open')
  handlePluginPanelOpen(
    client: Socket,
    payload: { pluginId: string; featureId: string; menuId: string; serverId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    void this.pluginGateway.notifyPanelOpened({
      pluginId: payload.pluginId,
      featureId: payload.featureId,
      menuId: payload.menuId,
      serverId: payload.serverId,
      userId,
    });
  }

  @SubscribeMessage('plugin:interaction')
  handlePluginInteraction(
    client: Socket,
    payload: {
      surface: 'modal' | 'panel' | 'channel-view' | 'message';
      surfaceId: string;
      actionId: string;
      values?: Record<string, unknown>;
      serverId: string;
      channelId?: string;
    },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    void this.pluginGateway.dispatchInteraction({
      surface: payload.surface,
      surfaceId: payload.surfaceId,
      actionId: payload.actionId,
      values: payload.values,
      serverId: payload.serverId,
      channelId: payload.channelId,
      userId,
      interactionId: `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
  }
}
