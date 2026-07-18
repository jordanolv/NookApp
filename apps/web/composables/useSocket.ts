import { io, type Socket } from 'socket.io-client';
import type {
  DirectMessagePublic,
  DmTypingPayload,
  MessageDeletedPayload,
  MessagePublic,
  PlayerAppearance,
  PlayerAppearancePayload,
  PlayerHelloPayload,
  PlayerMovedPayload,
  PlayerSnapshotPayload,
  PlayerState,
  VoiceParticipant,
  VoiceSnapshotPayload,
} from '@nookapp/protocol';

let socket: Socket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

const PING_INTERVAL_MS = 5000;
const PING_TIMEOUT_MS = 3000;

export function useSocket() {
  const { apiBase } = useRuntimeConfig().public;
  const socketBase = apiBase.replace('/api/v1', '');

  const latencyMs = useState<number | null>('socket.latencyMs', () => null);

  function startPingLoop() {
    if (pingTimer || !socket) return;
    const tick = () => {
      if (!socket?.connected) {
        latencyMs.value = null;
        return;
      }
      const sent = Date.now();
      socket
        .timeout(PING_TIMEOUT_MS)
        .emitWithAck('client:ping')
        .then(() => {
          latencyMs.value = Date.now() - sent;
        })
        .catch(() => {
          latencyMs.value = null;
        });
    };
    tick();
    pingTimer = setInterval(tick, PING_INTERVAL_MS);
  }

  function stopPingLoop() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    latencyMs.value = null;
  }

  function connect(token?: string) {
    // Idempotent based on existence, not connected state — otherwise we'd
    // create duplicate sockets while the first is still in handshake.
    if (socket) return socket;
    socket = io(socketBase, {
      withCredentials: true,
      auth: token ? { token } : undefined,
      transports: ['websocket'],
    });
    socket.on('connect', startPingLoop);
    socket.on('disconnect', stopPingLoop);
    if (socket.connected) startPingLoop();
    return socket;
  }

  function disconnect() {
    stopPingLoop();
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

  function onMessageUpdated(cb: (msg: MessagePublic) => void) {
    socket?.on('message:updated', cb);
    return () => socket?.off('message:updated', cb);
  }

  function onMessageDeleted(cb: (payload: MessageDeletedPayload) => void) {
    socket?.on('message:deleted', cb);
    return () => socket?.off('message:deleted', cb);
  }

  function onDmMessage(cb: (msg: DirectMessagePublic) => void) {
    socket?.on('dm:message', cb);
    return () => socket?.off('dm:message', cb);
  }

  function emitDmTyping(payload: { conversationId: string; toUserId: string }) {
    socket?.volatile.emit('dm:typing', payload);
  }

  function onDmTyping(cb: (payload: DmTypingPayload) => void) {
    socket?.on('dm:typing', cb);
    return () => socket?.off('dm:typing', cb);
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

  function emitPlayerAppearance(appearance: PlayerAppearance) {
    socket?.emit('player:appearance', { appearance });
  }

  function onPlayerAppearance(cb: (payload: PlayerAppearancePayload) => void) {
    socket?.on('player:appearance', cb);
    return () => socket?.off('player:appearance', cb);
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
    latencyMs: readonly(latencyMs),
    hello,
    onSnapshot,
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onDmMessage,
    emitDmTyping,
    onDmTyping,
    onPlayerJoined,
    onPlayerLeft,
    emitPlayerMoved,
    onPlayerMoved,
    emitPlayerAppearance,
    onPlayerAppearance,
    emitVoiceJoin,
    emitVoiceLeave,
    onVoiceSnapshot,
    onVoiceJoined,
    onVoiceLeft,
  };
}
