import type { ComputedRef, Ref } from 'vue';

type ServerIdSource = string | Ref<string> | ComputedRef<string>;

function prefixFor(source: ServerIdSource) {
  return `playing:${typeof source === 'string' ? source : source.value}:`;
}

// Games the current user declared playing. Stored in the per-user UI layout so
// the sidebar shows them as threads under their gaming widget on every device.
export function usePlayingGames(serverId: ServerIdSource) {
  const layout = useUiLayout();
  if (import.meta.client) void layout.ensureLoaded();

  const playingIds = computed(
    () => new Set(layout.entriesByPrefix(prefixFor(serverId)).map(([key]) => key.split(':')[2])),
  );

  function isPlaying(gameId: string): boolean {
    return playingIds.value.has(gameId);
  }

  function toggle(gameId: string): void {
    const key = `${prefixFor(serverId)}${gameId}`;
    if (isPlaying(gameId)) layout.remove(key);
    else layout.set(key, { since: Date.now() });
  }

  return { playingIds, isPlaying, toggle };
}
