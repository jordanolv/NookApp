import type { MapData } from '@nookapp/protocol';
import { decorAt, fillFloor, stampRoomWalls, type Rect } from './map-builder';

export interface MapTemplate {
  id: string;
  label: string;
  description: string;
  emoji: string;
  accent: string;
  build: () => MapData;
}

// Spawn is fixed at (35, 35) by syncCurrentMap, so every template is laid out around it.
const SPAWN = { x: 35, y: 35 } as const;

// Floor inset: one cell on the sides, two rows under the top wall band.
function interior(r: Rect): Rect {
  return { x: r.x + 1, y: r.y + 2, w: r.w - 2, h: r.h - 3 };
}

function buildEmpty(): MapData {
  return {
    width: 200,
    height: 200,
    spawn: SPAWN,
    layers: {
      floors: fillFloor({ x: 32, y: 32, w: 7, h: 7 }, 'office_floor_light'),
      walls: [],
      decor: [],
    },
  };
}

function buildOpenSpace(): MapData {
  const room: Rect = { x: 27, y: 28, w: 18, h: 14 };
  const deskX = [30, 33, 36, 39];
  return {
    width: 200,
    height: 200,
    spawn: SPAWN,
    layers: {
      floors: fillFloor(interior(room), 'office_floor_gray'),
      walls: stampRoomWalls(room, 'drywall'),
      decor: [
        ...deskX.map((x, i) => decorAt(`desk_pc_${i + 1}`, x, 32)),
        ...deskX.map((x) => decorAt('chair_blue', x, 33)),
        ...deskX.map((x, i) => decorAt(`desk_pc_${i + 1}`, x, 37)),
        ...deskX.map((x) => decorAt('chair_blue', x, 38)),
        decorAt('plant_tall', 28, 30),
        decorAt('plant_tall', 43, 30),
        decorAt('whiteboard', 31, 30),
        decorAt('vending', 42, 40),
      ],
    },
  };
}

function buildMeetingRooms(): MapData {
  const a: Rect = { x: 27, y: 29, w: 10, h: 12 };
  const b: Rect = { x: 37, y: 29, w: 10, h: 12 };
  return {
    width: 200,
    height: 200,
    spawn: SPAWN,
    layers: {
      floors: [
        ...fillFloor(interior(a), 'office_floor_blue'),
        ...fillFloor(interior(b), 'office_floor_wood'),
      ],
      walls: [...stampRoomWalls(a, 'light-blue'), ...stampRoomWalls(b, 'wood')],
      decor: [
        decorAt('whiteboard', 30, 31),
        decorAt('free_office_writing_table', 31, 35),
        decorAt('chair_gray', 30, 35),
        decorAt('chair_gray', 32, 35),
        decorAt('chair_gray', 31, 34),
        decorAt('plant_med', 28, 39),
        decorAt('sofa_1', 40, 33),
        decorAt('sofa_2', 42, 33),
        decorAt('free_office_coffee_maker', 44, 31),
        decorAt('plant_tall', 44, 39),
      ],
    },
  };
}

function buildLounge(): MapData {
  const room: Rect = { x: 29, y: 29, w: 15, h: 13 };
  return {
    width: 200,
    height: 200,
    spawn: SPAWN,
    layers: {
      floors: fillFloor(interior(room), 'office_floor_wood'),
      walls: stampRoomWalls(room, 'wood'),
      decor: [
        decorAt('sofa_1', 31, 33),
        decorAt('sofa_2', 33, 33),
        decorAt('plant_tall', 30, 31),
        decorAt('plant_tall', 42, 31),
        decorAt('plant_med', 41, 39),
        decorAt('free_office_coffee_maker', 40, 32),
        decorAt('poster_1', 36, 30),
      ],
    },
  };
}

// --- Templates ---

function buildStarterOffice(): MapData {
  const room: Rect = { x: 30, y: 30, w: 12, h: 11 };
  return {
    width: 200,
    height: 200,
    spawn: SPAWN,
    layers: {
      floors: fillFloor(interior(room), 'office_floor_light'),
      walls: stampRoomWalls(room, 'wood'),
      decor: [
        decorAt('desk_pc_1', 32, 33),
        decorAt('chair_blue', 32, 34),
        decorAt('desk_pc_2', 39, 33),
        decorAt('chair_blue', 39, 34),
        decorAt('whiteboard', 35, 31),
        decorAt('plant_tall', 31, 39),
        decorAt('plant_med', 40, 39),
      ],
    },
  };
}

export const EMPTY_TEMPLATE_ID = 'empty';

export const MAP_TEMPLATES: ReadonlyArray<MapTemplate> = [
  {
    id: EMPTY_TEMPLATE_ID,
    label: 'Page blanche',
    description: 'Un petit sol de départ. À toi de tout construire.',
    emoji: '⬜',
    accent: '#94a3b8',
    build: buildEmpty,
  },
  {
    id: 'starter-office',
    label: 'Bureau de démarrage',
    description: 'Petit bureau cosy avec deux postes de travail et un coin plantes.',
    emoji: '🏢',
    accent: '#6366f1',
    build: buildStarterOffice,
  },
  {
    id: 'open-space',
    label: 'Open-space',
    description: 'Grande salle avec rangées de bureaux et postes de travail.',
    emoji: '🖥️',
    accent: '#0ea5e9',
    build: buildOpenSpace,
  },
  {
    id: 'meeting-rooms',
    label: 'Salles de réunion',
    description: 'Deux salles : réunion + coin canapé pour discuter.',
    emoji: '📊',
    accent: '#f59e0b',
    build: buildMeetingRooms,
  },
  {
    id: 'lounge',
    label: 'Lounge détente',
    description: 'Salon cosy avec canapés, plantes et machine à café.',
    emoji: '🛋️',
    accent: '#22c55e',
    build: buildLounge,
  },
];

export const DEFAULT_TEMPLATE_ID = 'starter-office';

export function getMapTemplate(id: string): MapTemplate | undefined {
  return MAP_TEMPLATES.find((t) => t.id === id);
}

export function isEmptyTemplate(id: string): boolean {
  return id === EMPTY_TEMPLATE_ID;
}
