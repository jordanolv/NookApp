import { io, type Socket } from 'socket.io-client';
import type {
  MessagePublic,
  PlayerHelloPayload,
  PlayerMovedPayload,
  PlayerSnapshotPayload,
  PlayerState,
  VoiceParticipant,
  VoiceSnapshotPayload,
} from '@nookapp/protocol';

let socket: Socket | null = null;

export function useSocket() {
  const { apiBase } = useRuntimeConfig().public;
  const socketBase = apiBase.replace('/api/v1', '');

  function connect(token?: string) {
    // Idempotent based on existence, not connected state — otherwise we'd
    // create duplicate sockets while the first is still in handshake.
    if (socket) return socket;
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

  // hello replaces join:server — sends initial position so the server can build the snapshot
  function hello(payload: PlayerHelloPayload) {
    socket?.emit('player:hello', payload);
  }

  function onSnapshot(cb: (payload: PlayerSnapshotPayload) => void) {
    socket?.on('player:snapshot', cb);
    return () => socket?.off('player:snapshot', cb);
  }

  function onMessage(cb: (msg: MessagePublic) => void) {
    socket?.on('message:sent', cb);
    return () => socket?.off('message:sent', cb);
  }

  function onPlayerJoined(cb: (state: PlayerState) => void) {
    socket?.on('player:joined', cb);
    return () => socket?.off('player:joined', cb);
  }

  function onPlayerLeft(cb: (data: { userId: string }) => void) {
    socket?.on('player:left', cb);
    return () => socket?.off('player:left', cb);
  }

  function emitPlayerMoved(payload: PlayerMovedPayload) {
    socket?.volatile.emit('player:moved', payload);
  }

  function onPlayerMoved(cb: (payload: PlayerMovedPayload) => void) {
    socket?.on('player:moved', cb);
    return () => socket?.off('player:moved', cb);
  }

  function emitVoiceJoin(payload: { channelId: string }) {
    socket?.emit('voice:join', payload);
  }

  function emitVoiceLeave() {
    socket?.emit('voice:leave');
  }

  function onVoiceSnapshot(cb: (payload: VoiceSnapshotPayload) => void) {
    socket?.on('voice:snapshot', cb);
    return () => socket?.off('voice:snapshot', cb);
  }

  function onVoiceJoined(cb: (data: VoiceParticipant) => void) {
    socket?.on('voice:joined', cb);
    return () => socket?.off('voice:joined', cb);
  }

  function onVoiceLeft(cb: (data: { userId: string; channelId: string }) => void) {
    socket?.on('voice:left', cb);
    return () => socket?.off('voice:left', cb);
  }

  function raw(): Socket {
    if (!socket) throw new Error('Socket not connected');
    return socket;
  }

  return {
    connect,
    disconnect,
    raw,
    hello,
    onSnapshot,
    onMessage,
    onPlayerJoined,
    onPlayerLeft,
    emitPlayerMoved,
    onPlayerMoved,
    emitVoiceJoin,
    emitVoiceLeave,
    onVoiceSnapshot,
    onVoiceJoined,
    onVoiceLeft,
  };
}
