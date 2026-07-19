// Where each animation lives on the LimeZu character sheet (16x32 frames, 56
// per row). Shared by the Phaser scene and the Vue preview, so no Phaser here.

export type Direction = 'right' | 'up' | 'left' | 'down';

export const DIRECTIONS: readonly Direction[] = ['right', 'up', 'left', 'down'];

export const CG_FRAME_W = 16;
export const CG_FRAME_H = 32;
export const CG_SHEET_COLS = 56;

export const CG_WALK_FRAME_COUNT = 6;
export const CG_WALK_FRAME_RATE = 8;

export const CG_IDLE_FRAME: Record<Direction, number> = {
  right: 0,
  up: 1,
  left: 2,
  down: 3,
};

export const CG_WALK_START: Record<Direction, number> = {
  right: 112,
  up: 118,
  left: 124,
  down: 130,
};

// Static chair-sit pose per facing direction (CG sheet row 4, 224-235, legs
// forward). The sheet has NO camera-facing chair sit — the head only turns
// left / right / back. So 'down' has no true pose; it falls back to the most
// frontal 3/4 frame (227). Row 5 (280+) is a cross-legged FLOOR sit, unused
// here. Side- and back-facing seats map cleanly. See limezu_cg_layout memory.
export const CG_SIT_FRAME: Record<Direction, number> = {
  right: 224,
  left: 230,
  up: 233,
  down: 227,
};

export function sitFrame(dir: Direction): number {
  return CG_SIT_FRAME[dir];
}

export function idleFrame(dir: Direction): number {
  return CG_IDLE_FRAME[dir];
}

export function walkFrames(dir: Direction): number[] {
  const start = CG_WALK_START[dir];
  return Array.from({ length: CG_WALK_FRAME_COUNT }, (_, i) => start + i);
}

export function walkAnimKey(dir: Direction, bodyKey: string): string {
  return `walk-${dir}-${bodyKey}`;
}

// face the bigger of the two axes (so diagonals pick one direction)
export function directionFromVelocity(vx: number, vy: number): Direction {
  return Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
}

// frame number -> its column/row on the sheet
export function frameToCell(frame: number): { col: number; row: number } {
  return { col: frame % CG_SHEET_COLS, row: Math.floor(frame / CG_SHEET_COLS) };
}
