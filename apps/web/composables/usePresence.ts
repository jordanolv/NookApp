import { onMounted, onUnmounted, ref, shallowRef } from 'vue';
import type {
  PlayerState,
  PlayerMovedPayload,
  VoiceParticipant,
  VoiceSnapshotPayload,
} from '@nookapp/protocol';

export interface PresencePlayer {
  userId: string;
  name: string;
  x: number;
  y: number;
}

/**
 * Server-wide presence: who is where (positions) and who is in which voice channel.
 * Subscribes to socket events so the minimap and other consumers stay in sync
 * with the world without going through Phaser.
 */
const playersMap = shallowRef<Map<string, PresencePlayer>>(new Map());
const voiceMap = shallowRef<Map<string, VoiceParticipant[]>>(new Map());
const refCount = ref(0);
let cleanups: (() => void)[] = [];

function attach() {
  const socket = useSocket();

  cleanups.push(
    socket.onSnapshot((snap) => {
      const next = new Map<string, PresencePlayer>();
      next.set(snap.you.userId, {
        userId: snap.you.userId,
        name: snap.you.name,
        x: snap.you.x,
        y: snap.you.y,
      });
      for (const p of snap.others) {
        next.set(p.userId, { userId: p.userId, name: p.name, x: p.x, y: p.y });
      }
      playersMap.value = next;
    }),
  );

  cleanups.push(
    socket.onPlayerJoined((p: PlayerState) => {
      const next = new Map(playersMap.value);
      next.set(p.userId, { userId: p.userId, name: p.name, x: p.x, y: p.y });
      playersMap.value = next;
    }),
  );

  cleanups.push(
    socket.onPlayerLeft((p) => {
      const next = new Map(playersMap.value);
      next.delete(p.userId);
      playersMap.value = next;
    }),
  );

  cleanups.push(
    socket.onPlayerMoved((p: PlayerMovedPayload) => {
      const cur = playersMap.value.get(p.userId);
      if (!cur) return;
      const next = new Map(playersMap.value);
      next.set(p.userId, { ...cur, x: p.x, y: p.y });
      playersMap.value = next;
    }),
  );

  cleanups.push(
    socket.onVoiceSnapshot((snap: VoiceSnapshotPayload) => {
      const next = new Map<string, VoiceParticipant[]>();
      for (const p of snap.participants) {
        const arr = next.get(p.channelId) ?? [];
        arr.push(p);
        next.set(p.channelId, arr);
      }
      voiceMap.value = next;
    }),
  );

  cleanups.push(
    socket.onVoiceJoined((p) => {
      const next = new Map(voiceMap.value);
      // Remove from previous channel first
      for (const [chId, list] of next) {
        const filtered = list.filter((x) => x.userId !== p.userId);
        if (filtered.length !== list.length) next.set(chId, filtered);
      }
      const cur = next.get(p.channelId) ?? [];
      if (!cur.some((x) => x.userId === p.userId)) cur.push(p);
      next.set(p.channelId, cur);
      voiceMap.value = next;
    }),
  );

  cleanups.push(
    socket.onVoiceLeft((p) => {
      const next = new Map(voiceMap.value);
      const cur = next.get(p.channelId);
      if (cur)
        next.set(
          p.channelId,
          cur.filter((x) => x.userId !== p.userId),
        );
      voiceMap.value = next;
    }),
  );
}

function detach() {
  for (const fn of cleanups) {
    try {
      fn();
    } catch {
      /* noop */
    }
  }
  cleanups = [];
  playersMap.value = new Map();
  voiceMap.value = new Map();
}

function setLocalPlayer(p: { userId: string; name: string; x: number; y: number }) {
  const next = new Map(playersMap.value);
  const existing = next.get(p.userId);
  next.set(p.userId, { userId: p.userId, name: existing?.name ?? p.name, x: p.x, y: p.y });
  playersMap.value = next;
}

export function usePresence() {
  onMounted(() => {
    refCount.value += 1;
    if (refCount.value === 1) attach();
  });
  onUnmounted(() => {
    refCount.value -= 1;
    if (refCount.value === 0) detach();
  });

  return {
    players: playersMap,
    voiceMembers: voiceMap,
    setLocalPlayer,
  };
}
