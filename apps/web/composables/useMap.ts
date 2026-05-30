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
import { DEFAULT_TEMPLATE_ID, getMapTemplate } from '~/components/world/scene/map-templates';
import { stampRoomWalls } from '~/components/world/scene/map-builder';
import { WALL_SHEET, DEFAULT_ROOM_THEME_ID } from '~/components/world/scene/wall-catalog';

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
const selectedTemplate = ref<string>(DEFAULT_TEMPLATE_ID);
const selectedWallRegion = ref<{ col: number; row: number; w: number; h: number }>({
  col: 0,
  row: 0,
  w: 1,
  h: 1,
});
const selectedRoomTheme = ref<string>(DEFAULT_ROOM_THEME_ID);
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
    selectedTemplate.value = DEFAULT_TEMPLATE_ID;
    selectedWallRegion.value = { col: 0, row: 0, w: 1, h: 1 };
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
      const keep = floorsArray
        .toArray()
        .filter((cell) => !inRect(cell.x, cell.y, minX, minY, maxX, maxY));
      if (mode === 'add') {
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            keep.push({ asset, x, y });
          }
        }
      }
      floorsArray.delete(0, floorsArray.length);
      if (keep.length) floorsArray.insert(0, keep);
    });
  }

  function paintWallRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    region: { col: number; row: number; w: number; h: number },
    mode: 'add' | 'remove',
  ) {
    // Multi-tile brush in add mode → stamp once at (x1, y1), ignore drag end.
    // Single-tile brush OR remove mode → use the dragged rect (fill / clear).
    const isMultiTileBrush = mode === 'add' && (region.w > 1 || region.h > 1);
    const startX = Math.min(x1, x2);
    const startY = Math.min(y1, y2);
    const { minX, maxX, minY, maxY } = isMultiTileBrush
      ? {
          minX: startX,
          minY: startY,
          maxX: startX + region.w - 1,
          maxY: startY + region.h - 1,
        }
      : normalizeRect(x1, y1, x2, y2);

    ydoc.transact(() => {
      const keep = wallsArray
        .toArray()
        .filter((cell) => !inRect(cell.x, cell.y, minX, minY, maxX, maxY));
      if (mode === 'add') {
        for (let x = minX; x <= maxX; x += 1) {
          for (let y = minY; y <= maxY; y += 1) {
            if (x < 0 || x > 199 || y < 0 || y > 199) continue;
            const dx = (x - minX) % region.w;
            const dy = (y - minY) % region.h;
            const frame = (region.row + dy) * WALL_SHEET.cols + (region.col + dx);
            keep.push({ x, y, frame });
          }
        }
      }
      wallsArray.delete(0, wallsArray.length);
      if (keep.length) wallsArray.insert(0, keep);
    });
  }

  // Stamp a rectangular LimeZu room (themed border) into the walls layer.
  function stampRoom(x1: number, y1: number, x2: number, y2: number, themeId: string) {
    const { minX, maxX, minY, maxY } = normalizeRect(x1, y1, x2, y2);
    const cells = stampRoomWalls(
      { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      themeId,
    );
    if (!cells.length) return;

    const stamped = new Set(cells.map((c) => `${c.x},${c.y}`));
    ydoc.transact(() => {
      const keep = wallsArray.toArray().filter((cell) => !stamped.has(`${cell.x},${cell.y}`));
      for (const c of cells) keep.push(c);
      wallsArray.delete(0, wallsArray.length);
      if (keep.length) wallsArray.insert(0, keep);
    });
  }

  function resetMap() {
    ydoc.transact(() => {
      floorsArray.delete(0, floorsArray.length);
      wallsArray.delete(0, wallsArray.length);
      decorArray.delete(0, decorArray.length);
    });
  }

  function exportMapAsTemplate(): string {
    const floors = floorsArray.toArray();
    const walls = wallsArray.toArray();
    const decor = decorArray.toArray();
    const lines: string[] = [];
    lines.push('// Auto-exported template — paste into MAP_TEMPLATES:');
    lines.push('{');
    lines.push("  id: 'TODO-id',");
    lines.push("  label: 'TODO Label',");
    lines.push("  description: 'TODO description',");
    lines.push('  build: () => ({');
    lines.push('    width: 200,');
    lines.push('    height: 200,');
    lines.push(`    spawn: { x: ${currentMap.value.spawn.x}, y: ${currentMap.value.spawn.y} },`);
    lines.push('    layers: {');
    lines.push('      floors: [');
    for (const f of floors)
      lines.push(`        { x: ${f.x}, y: ${f.y}, asset: ${JSON.stringify(f.asset)} },`);
    lines.push('      ],');
    lines.push('      walls: [');
    for (const w of walls) lines.push(`        { x: ${w.x}, y: ${w.y}, frame: ${w.frame} },`);
    lines.push('      ],');
    lines.push('      decor: [');
    for (const d of decor)
      lines.push(
        `        { id: ${JSON.stringify(d.id)}, asset: ${JSON.stringify(d.asset)}, x: ${d.x}, y: ${d.y} },`,
      );
    lines.push('      ],');
    lines.push('    },');
    lines.push('  }),');
    lines.push('},');
    const out = lines.join('\n');
    console.log('[exportMapAsTemplate]\n' + out);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(out).catch(() => {});
    }
    return out;
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

  function applyTemplate(templateId: string) {
    const tpl = getMapTemplate(templateId);
    if (!tpl) return;
    const data = tpl.build();
    ydoc.transact(() => {
      floorsArray.delete(0, floorsArray.length);
      wallsArray.delete(0, wallsArray.length);
      decorArray.delete(0, decorArray.length);
      if (data.layers.floors.length) floorsArray.insert(0, data.layers.floors);
      if (data.layers.walls.length) wallsArray.insert(0, data.layers.walls);
      if (data.layers.decor.length) decorArray.insert(0, data.layers.decor);
    });
  }

  return {
    currentMap,
    buildMode,
    buildTool,
    selectedDecor,
    selectedFloor,
    selectedTemplate,
    selectedWallRegion,
    selectedRoomTheme,
    isSynced: readonly(isSynced),
    isSaving: readonly(isSaving),
    loadMap,
    paintRect,
    paintWallRect,
    placeDecor,
    removeDecorAt,
    eraseCell,
    applyTemplate,
    resetMap,
    stampRoom,
    exportMapAsTemplate,
  };
}
