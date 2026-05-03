import { DEFAULT_MAP, type MapData, type MapPublic } from '@nookapp/protocol';

// Module-level state: a single active map at a time, mirroring the active server.
const currentMap = ref<MapData>(DEFAULT_MAP);
const currentServerId = ref<string | null>(null);
const buildMode = ref(false);
const isSaving = ref(false);

const SAVE_DEBOUNCE_MS = 500;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function useMap() {
  const api = useApi();

  async function loadMap(serverId: string): Promise<MapData> {
    const result = await api.get<MapPublic>(`/servers/${serverId}/map`);
    currentMap.value = result.data;
    currentServerId.value = serverId;
    buildMode.value = false;
    return result.data;
  }

  async function flushSave() {
    const sid = currentServerId.value;
    if (!sid) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    isSaving.value = true;
    try {
      await api.put(`/servers/${sid}/map`, { data: currentMap.value });
    } finally {
      isSaving.value = false;
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }

  // Toggle a tile's presence. Removed tiles are tracked sparsely so the default
  // (full grid) serializes as an empty array.
  function toggleTile(x: number, y: number) {
    const data = currentMap.value;
    const idx = data.tiles.findIndex(([tx, ty]) => tx === x && ty === y);
    const tiles =
      idx >= 0
        ? data.tiles.filter((_, i) => i !== idx)
        : [...data.tiles, [x, y] as [number, number]];
    currentMap.value = { ...data, tiles };
    scheduleSave();
  }

  return {
    currentMap,
    buildMode,
    isSaving: readonly(isSaving),
    loadMap,
    toggleTile,
    flushSave,
  };
}
