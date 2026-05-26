import { onScopeDispose, ref, watch } from 'vue';
import { voicePresence } from './voice/state';

// Module-level state — single watcher and tick across all consumers.
const startedAt = ref<Map<string, number>>(new Map());
const now = ref<number>(Date.now());

let initialized = false;
let tickInterval: ReturnType<typeof setInterval> | null = null;
let stopWatch: (() => void) | null = null;
let refCount = 0;

function startTick() {
  if (tickInterval) return;
  now.value = Date.now();
  tickInterval = setInterval(() => {
    now.value = Date.now();
  }, 30_000);
}
function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  stopWatch = watch(
    voicePresence,
    (map) => {
      const next = new Map(startedAt.value);
      for (const [channelId, participants] of map.entries()) {
        const has = participants.length > 0;
        if (has && !next.has(channelId)) {
          next.set(channelId, Date.now());
        } else if (!has && next.has(channelId)) {
          next.delete(channelId);
        }
      }
      // Drop entries for channels that disappeared from the map entirely
      for (const channelId of next.keys()) {
        if (!map.has(channelId)) next.delete(channelId);
      }
      startedAt.value = next;
    },
    { deep: true, immediate: true },
  );
}

export function useVoiceActiveTime() {
  ensureInitialized();
  refCount += 1;
  startTick();

  onScopeDispose(() => {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
      stopTick();
    }
  });

  function startedAtOf(channelId: string): number | null {
    return startedAt.value.get(channelId) ?? null;
  }

  function formatElapsed(channelId: string): string {
    const start = startedAt.value.get(channelId);
    if (!start) return '';
    const elapsedMs = now.value - start;
    if (elapsedMs < 60_000) return "à l'instant";
    const minutes = Math.floor(elapsedMs / 60_000);
    if (minutes < 60) return `depuis ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem === 0 ? `depuis ${hours}h` : `depuis ${hours}h${rem.toString().padStart(2, '0')}`;
  }

  // Defensive: ensure the watcher cleanup runs if module is hot-reloaded
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      stopWatch?.();
      stopTick();
      initialized = false;
    });
  }

  return { startedAtOf, formatElapsed };
}
