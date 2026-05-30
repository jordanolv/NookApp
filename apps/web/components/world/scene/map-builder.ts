import type { DecorObject, FloorCell, WallCell } from '@nookapp/protocol';
import { DEFAULT_ROOM_THEME_ID, getRoomTheme, WALL_SHEET } from './wall-catalog';

// Shared map-geometry helpers: build floors/walls/decor as plain cell arrays.
// Used by map templates and by useMap's in-editor room stamping so both stay in sync.

const MIN = 0;
const MAX = 199;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function inBounds(x: number, y: number): boolean {
  return x >= MIN && x <= MAX && y >= MIN && y <= MAX;
}

export function fillFloor(rect: Rect, asset: string): FloorCell[] {
  const cells: FloorCell[] = [];
  for (let x = rect.x; x < rect.x + rect.w; x += 1) {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      if (inBounds(x, y)) cells.push({ asset, x, y });
    }
  }
  return cells;
}

// Compose a rectangular LimeZu room border from a theme's 8×7 sheet block.
// Theme-relative layout: TL(2,0) caps(3-4,2) TR(5,0); sides L(2,*) R(5,*); bottom(2-5,5).
// Minimum room: w >= 3, h >= 4. Returns [] for anything smaller.
export function stampRoomWalls(rect: Rect, themeId: string): WallCell[] {
  const minX = rect.x;
  const minY = rect.y;
  const maxX = rect.x + rect.w - 1;
  const maxY = rect.y + rect.h - 1;
  if (rect.w < 3 || rect.h < 4) return [];

  const theme = getRoomTheme(themeId) ?? getRoomTheme(DEFAULT_ROOM_THEME_ID);
  if (!theme) return [];
  const f = (col: number, row: number) =>
    (theme.rowOffset + row) * WALL_SHEET.cols + (theme.colOffset + col);

  const cells: WallCell[] = [];
  const push = (x: number, y: number, frame: number) => {
    if (inBounds(x, y)) cells.push({ x, y, frame });
  };

  // Top row
  push(minX, minY, f(2, 0));
  push(maxX, minY, f(5, 0));
  for (let i = 1; i < rect.w - 1; i += 1) push(minX + i, minY, i % 2 === 1 ? f(3, 2) : f(4, 2));
  // Top body row
  push(minX, minY + 1, f(2, 1));
  push(maxX, minY + 1, f(5, 1));
  for (let i = 1; i < rect.w - 1; i += 1) push(minX + i, minY + 1, i % 2 === 1 ? f(3, 3) : f(4, 3));
  // Middle rows (sides only)
  for (let row = minY + 2; row <= maxY - 1; row += 1) {
    push(minX, row, f(2, 2));
    push(maxX, row, f(5, 2));
  }
  // Bottom row
  push(minX, maxY, f(2, 5));
  push(maxX, maxY, f(5, 5));
  for (let i = 1; i < rect.w - 1; i += 1) push(minX + i, maxY, i % 2 === 1 ? f(3, 5) : f(4, 5));

  return cells;
}

let decorSeq = 0;

export function decorAt(asset: string, x: number, y: number): DecorObject {
  decorSeq += 1;
  return { id: `tpl-${decorSeq}`, asset, x, y };
}
