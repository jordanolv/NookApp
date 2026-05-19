import { WALL_SHEET } from './wall-catalog';

// Each room template is a list of (dx, dy, frame) offsets relative to the
// click anchor (top-left of the stamp). Pieces are picked manually from the
// LimeZu Room_Builder 3D walls sheet to compose authentic-looking rooms.

export interface RoomTemplateCell {
  dx: number;
  dy: number;
  frame: number;
}

export interface RoomTemplate {
  id: string;
  label: string;
  width: number;
  height: number;
  cells: ReadonlyArray<RoomTemplateCell>;
}

const cols = WALL_SHEET.cols;
// Sprite at (col, row) in the sheet → frame index
const F = (col: number, row: number) => row * cols + col;

// Theme block helpers. The 8×7 block at (themeCol, themeRow) contains room
// pieces at specific sub-offsets. These offsets were derived from the LimeZu
// reference rooms within each theme block.
//
// Within a theme block:
//   y=0 cap top:    (1,1) | (3,2) | (4,2)×N | (6,1)
//   y=1 back body:  (1,3) | (3,3)×N         | (6,3)
//   y=2..H-2 sides: (1,5) left              | (6,5) right
//   y=H-1 bottom:   (2,5) | (3,5)×N         | (5,5)

function buildRoom(themeCol: number, themeRow: number, w: number, h: number): RoomTemplateCell[] {
  const out: RoomTemplateCell[] = [];
  const f = (cc: number, rr: number) => F(themeCol + cc, themeRow + rr);
  const x2 = w - 1;
  const y2 = h - 1;

  // Top cap row
  out.push({ dx: 0, dy: 0, frame: f(1, 1) });
  out.push({ dx: x2, dy: 0, frame: f(6, 1) });
  out.push({ dx: 1, dy: 0, frame: f(3, 2) });
  for (let xx = 2; xx <= x2 - 1; xx += 1) out.push({ dx: xx, dy: 0, frame: f(4, 2) });

  // Back-wall body row
  out.push({ dx: 0, dy: 1, frame: f(1, 3) });
  out.push({ dx: x2, dy: 1, frame: f(6, 3) });
  for (let xx = 1; xx <= x2 - 1; xx += 1) out.push({ dx: xx, dy: 1, frame: f(3, 3) });

  // Side walls
  for (let yy = 2; yy <= y2 - 1; yy += 1) {
    out.push({ dx: 0, dy: yy, frame: f(1, 5) });
    out.push({ dx: x2, dy: yy, frame: f(6, 5) });
  }

  // Bottom row
  out.push({ dx: 0, dy: y2, frame: f(2, 5) });
  out.push({ dx: x2, dy: y2, frame: f(5, 5) });
  for (let xx = 1; xx <= x2 - 1; xx += 1) out.push({ dx: xx, dy: y2, frame: f(3, 5) });

  return out;
}

// Themes confirmed earlier in this session via the labeled sheet preview:
//   col=0,  row=0  → brown wood
//   col=8,  row=0  → drywall gray
//   col=8,  row=14 → cream beige
export const ROOM_TEMPLATES: ReadonlyArray<RoomTemplate> = [
  {
    id: 'wood_small',
    label: 'Bois petit (5×5)',
    width: 5,
    height: 5,
    cells: buildRoom(0, 0, 5, 5),
  },
  {
    id: 'wood_medium',
    label: 'Bois moyen (7×6)',
    width: 7,
    height: 6,
    cells: buildRoom(0, 0, 7, 6),
  },
  {
    id: 'drywall_small',
    label: 'Drywall petit (5×5)',
    width: 5,
    height: 5,
    cells: buildRoom(8, 0, 5, 5),
  },
  {
    id: 'drywall_medium',
    label: 'Drywall moyen (7×6)',
    width: 7,
    height: 6,
    cells: buildRoom(8, 0, 7, 6),
  },
  {
    id: 'cream_small',
    label: 'Crème petit (5×5)',
    width: 5,
    height: 5,
    cells: buildRoom(8, 14, 5, 5),
  },
  {
    id: 'cream_medium',
    label: 'Crème moyen (7×6)',
    width: 7,
    height: 6,
    cells: buildRoom(8, 14, 7, 6),
  },
];

const BY_ID = new Map(ROOM_TEMPLATES.map((t) => [t.id, t]));
export function getRoomTemplate(id: string): RoomTemplate | undefined {
  return BY_ID.get(id);
}

export const DEFAULT_ROOM_TEMPLATE_ID = 'drywall_small';
