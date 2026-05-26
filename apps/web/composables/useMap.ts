import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
  DEFAULT_MAP,
  type DecorObject,
  type FloorCell,
  type MapData,
  type WallCell,
} from '@nookapp/protocol';
import type { BuildTool } from '~/components/world/NookScene';
import {
  DEFAULT_WALL_FRAME,
  stampRoomCells,
  themeOfFrame,
  type WallThemeBlock,
} from '~/components/world/scene/wall-catalog';
import { DEFAULT_ROOM_TEMPLATE_ID, getRoomTemplate } from '~/components/world/scene/room-templates';

const ydoc = new Y.Doc();
const floorsArray = ydoc.getArray<FloorCell>('floors');
const wallsArray = ydoc.getArray<WallCell>('walls');
const decorArray = ydoc.getArray<DecorObject>('decor');

let provider: HocuspocusProvider | null = null;
let pendingMapSyncFrame: number | null = null;

const currentServerId = ref<string | null>(null);
const buildMode = ref(false);
const buildTool = ref<BuildTool>('tile');
const selectedDecor = ref<string | null>(null);
const selectedFloor = ref<string>('office_floor_light');
const selectedWallFrame = ref<number>(DEFAULT_WALL_FRAME);
const selectedRoomTheme = ref<WallThemeBlock>(themeOfFrame(DEFAULT_WALL_FRAME));
const selectedRoomTemplate = ref<string>(DEFAULT_ROOM_TEMPLATE_ID);
const isSynced = ref(false);
const isSaving = ref(false);
const currentMap = shallowRef<MapData>(DEFAULT_MAP);

function syncCurrentMap() {
  pendingMapSyncFrame = null;
  currentMap.value = {
    width: DEFAULT_MAP.width,
    height: DEFAULT_MAP.height,
    spawn: DEFAULT_MAP.spawn,
    layers: {
      floors: floorsArray.toArray(),
      walls: wallsArray.toArray(),
      decor: decorArray.toArray(),
    },
  };
}

function scheduleCurrentMapSync() {
  if (!isSynced.value || pendingMapSyncFrame !== null) return;
  pendingMapSyncFrame = requestAnimationFrame(syncCurrentMap);
}

floorsArray.observe(() => scheduleCurrentMapSync());
wallsArray.observe(() => scheduleCurrentMapSync());
decorArray.observe(() => scheduleCurrentMapSync());

function inRect(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number) {
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  return {
    minX: Math.min(x1, x2),
    maxX: Math.max(x1, x2),
    minY: Math.min(y1, y2),
    maxY: Math.max(y1, y2),
  };
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useMap() {
  const api = useApi();
  const config = useRuntimeConfig();

  async function loadMap(serverId: string): Promise<MapData> {
    if (provider && currentServerId.value !== serverId) {
      provider.destroy();
      provider = null;
      isSynced.value = false;
      if (pendingMapSyncFrame !== null) {
        cancelAnimationFrame(pendingMapSyncFrame);
        pendingMapSyncFrame = null;
      }
      currentMap.value = DEFAULT_MAP;
      ydoc.transact(() => {
        floorsArray.delete(0, floorsArray.length);
        wallsArray.delete(0, wallsArray.length);
        decorArray.delete(0, decorArray.length);
      });
    }

    currentServerId.value = serverId;
    buildMode.value = false;
    buildTool.value = 'tile';
    selectedDecor.value = null;
    selectedFloor.value = 'office_floor_light';
    selectedWallFrame.value = DEFAULT_WALL_FRAME;
    selectedRoomTheme.value = themeOfFrame(DEFAULT_WALL_FRAME);
    selectedRoomTemplate.value = DEFAULT_ROOM_TEMPLATE_ID;
    if (!isSynced.value) currentMap.value = DEFAULT_MAP;

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
            syncCurrentMap();
            resolve();
          },
          onAuthenticationFailed: () => reject(new Error('collaboration auth failed')),
        });
      });
    }

    return currentMap.value;
  }

  function paintRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    mode: 'add' | 'remove',
    asset = 'office_floor_light',
  ) {
    const { minX, maxX, minY, maxY } = normalizeRect(x1, y1, x2, y2);
    ydoc.transact(() => {
      // Cells occupied by walls — never paint floor there, the wall sprite has
      // transparent areas that would let the floor show through (visible as a
      // pale strip below baseboards, etc.).
      const blockedCells = new Set(wallsArray.toArray().map((w) => `${w.x},${w.y}`));
      const keep = floorsArray
        .toArray()
        .filter((cell) => !inRect(cell.x, cell.y, minX, minY, maxX, maxY));
      if (mode === 'add') {
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            if (blockedCells.has(`${x},${y}`)) continue;
            keep.push({ asset, x, y });
          }
        }
      }
      floorsArray.delete(0, floorsArray.length);
      if (keep.length) floorsArray.insert(0, keep);
    });
  }

  function paintWallCell(x: number, y: number, frame: number, mode: 'add' | 'remove') {
    if (x < 0 || y < 0 || x > 199 || y > 199) return;
    ydoc.transact(() => {
      const keep = wallsArray.toArray().filter((cell) => cell.x !== x || cell.y !== y);
      if (mode === 'add') keep.push({ x, y, frame });
      wallsArray.delete(0, wallsArray.length);
      if (keep.length) wallsArray.insert(0, keep);
    });
  }

  function stampRoomTemplate(originX: number, originY: number, templateId: string) {
    const tpl = getRoomTemplate(templateId);
    if (!tpl) return;
    ydoc.transact(() => {
      const stamped = new Map<string, number>();
      for (const c of tpl.cells) {
        const x = originX + c.dx;
        const y = originY + c.dy;
        if (x < 0 || y < 0 || x > 199 || y > 199) continue;
        stamped.set(`${x},${y}`, c.frame);
      }
      const keep = wallsArray.toArray().filter((cell) => !stamped.has(`${cell.x},${cell.y}`));
      for (const [key, frame] of stamped) {
        const [xs, ys] = key.split(',');
        keep.push({ x: Number(xs), y: Number(ys), frame });
      }
      wallsArray.delete(0, wallsArray.length);
      if (keep.length) wallsArray.insert(0, keep);
    });
  }

  function stampCustomRoom(x1: number, y1: number, x2: number, y2: number, themeFrame: number) {
    const { minX, maxX, minY, maxY } = normalizeRect(x1, y1, x2, y2);
    const theme = themeOfFrame(themeFrame);
    const cells = stampRoomCells(minX, minY, maxX - minX + 1, maxY - minY + 1, theme);
    if (!cells.length) return;
    ydoc.transact(() => {
      const stamped = new Map(cells.map((c) => [`${c.x},${c.y}`, c.frame]));
      const keep = wallsArray.toArray().filter((cell) => !stamped.has(`${cell.x},${cell.y}`));
      for (const c of cells) keep.push({ x: c.x, y: c.y, frame: c.frame });
      wallsArray.delete(0, wallsArray.length);
      if (keep.length) wallsArray.insert(0, keep);
    });
  }

  function clearWallsRect(x1: number, y1: number, x2: number, y2: number) {
    const { minX, maxX, minY, maxY } = normalizeRect(x1, y1, x2, y2);
    ydoc.transact(() => {
      const keep = wallsArray
        .toArray()
        .filter((cell) => !inRect(cell.x, cell.y, minX, minY, maxX, maxY));
      if (keep.length === wallsArray.length) return;
      wallsArray.delete(0, wallsArray.length);
      if (keep.length) wallsArray.insert(0, keep);
    });
  }

  function placeDecor(asset: string, x: number, y: number) {
    if (x < 0 || y < 0 || x > 199 || y > 199) return;
    if (decorArray.toArray().some((item) => item.x === x && item.y === y)) return;
    decorArray.push([{ id: generateId(), asset, x, y }]);
  }

  function removeDecorAt(x: number, y: number) {
    const keep = decorArray.toArray().filter((item) => item.x !== x || item.y !== y);
    if (keep.length === decorArray.length) return;
    ydoc.transact(() => {
      decorArray.delete(0, decorArray.length);
      if (keep.length) decorArray.insert(0, keep);
    });
  }

  function eraseCell(x: number, y: number) {
    if (x < 0 || y < 0 || x > 199 || y > 199) return;
    ydoc.transact(() => {
      const floors = floorsArray.toArray().filter((cell) => cell.x !== x || cell.y !== y);
      if (floors.length !== floorsArray.length) {
        floorsArray.delete(0, floorsArray.length);
        if (floors.length) floorsArray.insert(0, floors);
      }
      const walls = wallsArray.toArray().filter((cell) => cell.x !== x || cell.y !== y);
      if (walls.length !== wallsArray.length) {
        wallsArray.delete(0, wallsArray.length);
        if (walls.length) wallsArray.insert(0, walls);
      }
      const decor = decorArray.toArray().filter((item) => item.x !== x || item.y !== y);
      if (decor.length !== decorArray.length) {
        decorArray.delete(0, decorArray.length);
        if (decor.length) decorArray.insert(0, decor);
      }
    });
  }

  return {
    currentMap,
    buildMode,
    buildTool,
    selectedDecor,
    selectedFloor,
    selectedWallFrame,
    selectedRoomTheme,
    selectedRoomTemplate,
    isSynced: readonly(isSynced),
    isSaving: readonly(isSaving),
    loadMap,
    paintRect,
    paintWallCell,
    stampRoomTemplate,
    stampCustomRoom,
    clearWallsRect,
    placeDecor,
    removeDecorAt,
    eraseCell,
  };
}
