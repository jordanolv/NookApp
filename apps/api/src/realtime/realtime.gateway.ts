import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { playerEmoteSchema, playerPresenceSchema } from '@nookapp/protocol';
import type {
  PlayerAppearancePayload,
  PlayerEmotePayload,
  PlayerHelloPayload,
  PlayerMovedPayload,
  PlayerPresencePayload,
  PlayerSnapshotPayload,
  ServerJoinPayload,
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
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly rooms = new Map<string, RoomPlayers>();
  // serverId → Map<userId, display name>, for every socket in the room (classic clients included)
  private readonly names = new Map<string, Map<string, string>>();
  // serverId → Map<userId, channelId>
  private readonly voicePresence = new Map<string, Map<string, string>>();

  constructor(
    private readonly authService: AuthService,
    private readonly members: MembersService,
  ) {}

  // Authenticate in a middleware: it completes before the connection is
  // established, so no message handler can run with an empty client.data.
  afterInit(server: Server) {
    server.use((client, next) => {
      const token = client.handshake.auth['token'] as string | undefined;
      const headers = token ? { authorization: `Bearer ${token}` } : client.handshake.headers;
      this.authService
        .getSession(headers as Record<string, string>)
        .then((session) => {
          if (!session) return next(new Error('unauthorized'));
          client.data.userId = session.user.id;
          client.data.name = session.user.name;
          next();
        })
        .catch(() => next(new Error('unauthorized')));
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.disconnect(true);
      return;
    }
    client.join(`user:${userId}`);
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
    this.names.get(serverId)?.delete(userId);
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

    this.enterServer(client, serverId, userId, name);

    const saved = await this.members.getLastPosition(serverId, userId).catch(() => null);
    if (saved) {
      x = saved.x;
      y = saved.y;
    }

    if (!this.rooms.has(serverId)) this.rooms.set(serverId, new Map());
    const room = this.rooms.get(serverId)!;

    const presence = playerPresenceSchema.safeParse(payload.presence);
    const me: PlayerState = {
      userId,
      name,
      x,
      y,
      dir,
      appearance,
      presence: presence.success ? presence.data : undefined,
    };
    const snapshot: PlayerSnapshotPayload = {
      you: me,
      others: Array.from(room.values()).filter((p) => p.userId !== userId),
    };
    client.emit('player:snapshot', snapshot);

    room.set(userId, me);
    client.to(`server:${serverId}`).emit('player:joined', me);
    this.emitVoiceSnapshot(client, serverId);
  }

  @SubscribeMessage('server:join')
  async handleServerJoin(client: Socket, payload: ServerJoinPayload) {
    const userId = client.data.userId as string;
    const isMember = await this.members.isMember(payload.serverId, userId);
    if (!isMember) {
      client.emit('player:error', { code: 'forbidden', message: 'Not a member of this server' });
      return;
    }
    this.enterServer(client, payload.serverId, userId, payload.name);
    this.emitVoiceSnapshot(client, payload.serverId);
  }

  private enterServer(client: Socket, serverId: string, userId: string, name: string) {
    client.join(`server:${serverId}`);
    client.data.serverId = serverId;
    client.data.name = name;
    if (!this.names.has(serverId)) this.names.set(serverId, new Map());
    this.names.get(serverId)!.set(userId, name);
  }

  private emitVoiceSnapshot(client: Socket, serverId: string) {
    const vp = this.voicePresence.get(serverId);
    const names = this.names.get(serverId);
    const participants: VoiceParticipant[] = [];
    if (vp) {
      for (const [uid, channelId] of vp.entries()) {
        const name = names?.get(uid);
        if (name) participants.push({ userId: uid, name, channelId });
      }
    }
    const snapshot: VoiceSnapshotPayload = { participants };
    client.emit('voice:snapshot', snapshot);
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

  @SubscribeMessage('player:presence')
  handlePlayerPresence(client: Socket, payload: { presence: unknown }) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;
    const parsed = playerPresenceSchema.safeParse(payload?.presence);
    if (!parsed.success) return;

    const room = this.rooms.get(serverId);
    const prev = room?.get(userId);
    if (room && prev) room.set(userId, { ...prev, presence: parsed.data });

    const out: PlayerPresencePayload = { userId, presence: parsed.data };
    client.to(`server:${serverId}`).emit('player:presence', out);
  }

  @SubscribeMessage('player:emote')
  handlePlayerEmote(client: Socket, payload: { emote: unknown }) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;
    const parsed = playerEmoteSchema.safeParse(payload?.emote);
    if (!parsed.success) return;

    // Includes the sender so every client renders the emote the same way.
    const out: PlayerEmotePayload = { userId, emote: parsed.data };
    this.server.to(`server:${serverId}`).emit('player:emote', out);
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
