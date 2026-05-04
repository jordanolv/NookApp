import { DEFAULT_MAP, type MapData, type MapItem, type MapPublic } from '@nookapp/protocol';
import type { BuildTool } from '~/components/world/NookScene';

const currentMap = ref<MapData>(DEFAULT_MAP);
const currentServerId = ref<string | null>(null);
const buildMode = ref(false);
const buildTool = ref<BuildTool>('tile');
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
    buildTool.value = 'tile';
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

  function paintRect(x1: number, y1: number, x2: number, y2: number, mode: 'add' | 'remove') {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const data = currentMap.value;

    if (mode === 'add') {
      const existing = new Set(data.tiles.map(([x, y]) => `${x},${y}`));
      const additions: [number, number][] = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          if (!existing.has(`${x},${y}`)) additions.push([x, y]);
        }
      }
      if (!additions.length) return;
      currentMap.value = { ...data, tiles: [...data.tiles, ...additions] };
    } else {
      const tiles = data.tiles.filter(([x, y]) => x < minX || x > maxX || y < minY || y > maxY);
      if (tiles.length === data.tiles.length) return;
      currentMap.value = { ...data, tiles };
    }
    scheduleSave();
  }

  function paintWallsRect(x1: number, y1: number, x2: number, y2: number, mode: 'add' | 'remove') {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const data = currentMap.value;

    if (mode === 'add') {
      const existing = new Set(
        data.items.filter((item) => item.type === 'wall').map((item) => `${item.x},${item.y}`),
      );
      const additions: MapItem[] = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          if (!existing.has(`${x},${y}`)) additions.push({ type: 'wall', x, y });
        }
      }
      if (!additions.length) return;
      currentMap.value = { ...data, items: [...data.items, ...additions] };
    } else {
      const items = data.items.filter(
        (item) =>
          !(
            item.type === 'wall' &&
            item.x >= minX &&
            item.x <= maxX &&
            item.y >= minY &&
            item.y <= maxY
          ),
      );
      if (items.length === data.items.length) return;
      currentMap.value = { ...data, items };
    }
    scheduleSave();
  }

  return {
    currentMap,
    buildMode,
    buildTool,
    isSaving: readonly(isSaving),
    loadMap,
    paintRect,
    paintWallsRect,
    flushSave,
  };
}
