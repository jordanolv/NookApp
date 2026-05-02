import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { PlayerMovedPayload } from '@nookapp/protocol';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

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
  }

  handleDisconnect(client: Socket) {
    const serverId = client.data.serverId as string | undefined;
    if (serverId) {
      client.to(`server:${serverId}`).emit('player:left', { userId: client.data.userId });
    }
  }

  @SubscribeMessage('join:server')
  handleJoinServer(client: Socket, serverId: string) {
    client.join(`server:${serverId}`);
    client.data.serverId = serverId;
    client.to(`server:${serverId}`).emit('player:joined', { userId: client.data.userId });
  }

  @SubscribeMessage('player:moved')
  handlePlayerMoved(client: Socket, payload: PlayerMovedPayload) {
    const serverId = client.data.serverId as string | undefined;
    if (!serverId) return;
    client.volatile.to(`server:${serverId}`).emit('player:moved', payload);
  }

  emitToServer(serverId: string, event: string, payload: unknown) {
    this.server.to(`server:${serverId}`).emit(event, payload);
  }
}
