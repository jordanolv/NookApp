import { io, type Socket } from 'socket.io-client';
import type { MessagePublic } from '@nookapp/protocol';

let socket: Socket | null = null;

export function useSocket() {
  const { apiBase } = useRuntimeConfig().public;
  const socketBase = apiBase.replace('/api/v1', '');

  function connect(token?: string) {
    if (socket?.connected) return socket;
    socket = io(socketBase, {
      withCredentials: true,
      auth: token ? { token } : undefined,
      transports: ['websocket'],
    });
    return socket;
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
  }

  function joinServer(serverId: string) {
    socket?.emit('join:server', serverId);
  }

  function onMessage(cb: (msg: MessagePublic) => void) {
    socket?.on('message:sent', cb);
    return () => socket?.off('message:sent', cb);
  }

  function onPlayerJoined(cb: (data: { userId: string }) => void) {
    socket?.on('player:joined', cb);
    return () => socket?.off('player:joined', cb);
  }

  function onPlayerLeft(cb: (data: { userId: string }) => void) {
    socket?.on('player:left', cb);
    return () => socket?.off('player:left', cb);
  }

  return { connect, disconnect, joinServer, onMessage, onPlayerJoined, onPlayerLeft };
}
