import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
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
import { MembersService } from '../members/members.service';

type RoomPlayers = Map<string, PlayerState>;

@WebSocketGateway({
  cors: {
    origin: process.env.NUXT_PUBLIC_WEB_URL ?? 'http://localhost:4001',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly rooms = new Map<string, RoomPlayers>();
  // serverId → Map<userId, channelId>
  private readonly voicePresence = new Map<string, Map<string, string>>();

  constructor(
    private readonly authService: AuthService,
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

    const vp = this.voicePresence.get(serverId);
    const channelId = vp?.get(userId);
    if (vp && channelId) {
      vp.delete(userId);
      this.server.to(`server:${serverId}`).emit('voice:left', { userId, channelId });
    }
  }

  @SubscribeMessage('player:hello')
  async handlePlayerHello(client: Socket, payload: PlayerHelloPayload) {
    const { serverId, name, dir, appearance } = payload;
    let { x, y } = payload;
    const userId = client.data.userId as string;

    const isMember = await this.members.isMember(serverId, userId);
    if (!isMember) {
      client.emit('player:error', { code: 'forbidden', message: 'Not a member of this server' });
      return;
    }

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
      room.set(userId, {
        ...prev,
        x: payload.x,
        y: payload.y,
        dir: payload.dir,
        pose: payload.pose,
      });
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
    }

    vp.set(userId, payload.channelId);
    this.server
      .to(`server:${serverId}`)
      .emit('voice:joined', { userId, name, channelId: payload.channelId });
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
  }

  @SubscribeMessage('dm:typing')
  handleDmTyping(client: Socket, payload: { conversationId: string; toUserId: string }) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !payload?.toUserId || !payload?.conversationId) return;
    this.server
      .to(`user:${payload.toUserId}`)
      .emit('dm:typing', { conversationId: payload.conversationId, fromUserId: userId });
  }

  @SubscribeMessage('client:ping')
  handleClientPing() {
    return { t: Date.now() };
  }

  emitToServer(serverId: string, event: string, payload: unknown) {
    this.server.to(`server:${serverId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
