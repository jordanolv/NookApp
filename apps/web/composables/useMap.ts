import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { DEFAULT_MAP, type MapData, type MapItem } from '@nookapp/protocol';
import type { BuildTool } from '~/components/world/NookScene';

// Module-level singletons — one Y.Doc, one provider at a time
const ydoc = new Y.Doc();
const tilesArray = ydoc.getArray<number[]>('tiles');
const itemsArray = ydoc.getArray<MapItem>('items');

let provider: HocuspocusProvider | null = null;

const currentServerId = ref<string | null>(null);
const buildMode = ref(false);
const buildTool = ref<BuildTool>('tile');
const isSynced = ref(false);
const isSaving = ref(false);

// Derived reactive map — updates automatically when Y.js arrays change
const currentMap = ref<MapData>(DEFAULT_MAP);

function syncCurrentMap() {
  currentMap.value = {
    tiles: tilesArray.toArray() as [number, number][],
    items: itemsArray.toArray(),
  };
}

tilesArray.observe(() => syncCurrentMap());
itemsArray.observe(() => syncCurrentMap());

export function useMap() {
  const api = useApi();
  const config = useRuntimeConfig();

  async function loadMap(serverId: string): Promise<MapData> {
    // Tear down previous provider if switching servers
    if (provider && currentServerId.value !== serverId) {
      provider.destroy();
      provider = null;
      isSynced.value = false;
      ydoc.transact(() => {
        tilesArray.delete(0, tilesArray.length);
        itemsArray.delete(0, itemsArray.length);
      });
    }

    currentServerId.value = serverId;
    buildMode.value = false;
    buildTool.value = 'tile';

    if (!provider) {
      await new Promise<void>((resolve, reject) => {
        provider = new HocuspocusProvider({
          url: config.public.collabUrl as string,
          name: serverId,
          document: ydoc,
          token: async () => {
            const { token } = await api.get<{ token: string }>('/collaboration/token');
            return token;
          },
          onSynced: () => {
            isSynced.value = true;
            resolve();
          },
          onAuthenticationFailed: () => reject(new Error('collaboration auth failed')),
        });
      });
    }

    return currentMap.value;
  }

  function paintRect(x1: number, y1: number, x2: number, y2: number, mode: 'add' | 'remove') {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    ydoc.transact(() => {
      if (mode === 'add') {
        const existing = new Set(tilesArray.toArray().map(([x, y]) => `${x},${y}`));
        const additions: [number, number][] = [];
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            if (!existing.has(`${x},${y}`)) additions.push([x, y]);
          }
        }
        if (additions.length) tilesArray.push(additions);
      } else {
        const keep: [number, number][] = [];
        let changed = false;
        for (const tile of tilesArray.toArray()) {
          const [tx, ty] = tile as [number, number];
          if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) {
            changed = true;
          } else {
            keep.push([tx, ty]);
          }
        }
        if (!changed) return;
        tilesArray.delete(0, tilesArray.length);
        if (keep.length) tilesArray.push(keep);
      }
    });
  }

  function paintWallsRect(x1: number, y1: number, x2: number, y2: number, mode: 'add' | 'remove') {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    ydoc.transact(() => {
      if (mode === 'add') {
        const existing = new Set(
          itemsArray
            .toArray()
            .filter((it) => it.type === 'wall')
            .map((it) => `${it.x},${it.y}`),
        );
        const additions: MapItem[] = [];
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            if (!existing.has(`${x},${y}`)) additions.push({ type: 'wall', x, y });
          }
        }
        if (additions.length) itemsArray.push(additions);
      } else {
        const keep: MapItem[] = [];
        let changed = false;
        for (const item of itemsArray.toArray()) {
          if (
            item.type === 'wall' &&
            item.x >= minX &&
            item.x <= maxX &&
            item.y >= minY &&
            item.y <= maxY
          ) {
            changed = true;
          } else {
            keep.push(item);
          }
        }
        if (!changed) return;
        itemsArray.delete(0, itemsArray.length);
        if (keep.length) itemsArray.push(keep);
      }
    });
  }

  return {
    currentMap,
    buildMode,
    buildTool,
    isSynced: readonly(isSynced),
    isSaving: readonly(isSaving),
    loadMap,
    paintRect,
    paintWallsRect,
  };
}
