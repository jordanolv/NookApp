import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type {
  PlayerHelloPayload,
  PlayerMovedPayload,
  PlayerSnapshotPayload,
  PlayerState,
} from '@nookapp/protocol';
import { AuthService } from '../auth/auth.service';

// In-memory presence per server room — resets on restart (acceptable for now)
type RoomPlayers = Map<string, PlayerState>; // userId -> state

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly rooms = new Map<string, RoomPlayers>();

  constructor(private readonly authService: AuthService) {}

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
  }

  // Client sends hello with initial position after joining a server.
  // Server responds with snapshot of all existing players, then broadcasts the newcomer.
  @SubscribeMessage('player:hello')
  handlePlayerHello(client: Socket, payload: PlayerHelloPayload) {
    const { serverId, name, x, y, dir } = payload;
    const userId = client.data.userId as string;

    client.join(`server:${serverId}`);
    client.data.serverId = serverId;
    client.data.name = name;

    if (!this.rooms.has(serverId)) this.rooms.set(serverId, new Map());
    const room = this.rooms.get(serverId)!;

    // Build the newcomer's state and snapshot
    const me: PlayerState = { userId, name, x, y, dir };
    const snapshot: PlayerSnapshotPayload = {
      you: me,
      others: Array.from(room.values()).filter((p) => p.userId !== userId),
    };
    client.emit('player:snapshot', snapshot);

    // Store and broadcast to everyone else
    room.set(userId, me);
    client.to(`server:${serverId}`).emit('player:joined', me);
  }

  @SubscribeMessage('player:moved')
  handlePlayerMoved(client: Socket, payload: PlayerMovedPayload) {
    const serverId = client.data.serverId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!serverId || !userId) return;

    // Always use server-side userId — never trust client-supplied value
    payload.userId = userId;

    const room = this.rooms.get(serverId);
    if (room?.has(userId)) {
      const prev = room.get(userId)!;
      room.set(userId, { ...prev, x: payload.x, y: payload.y, dir: payload.dir });
    }

    client.volatile.to(`server:${serverId}`).emit('player:moved', payload);
  }

  emitToServer(serverId: string, event: string, payload: unknown) {
    this.server.to(`server:${serverId}`).emit(event, payload);
  }
}
