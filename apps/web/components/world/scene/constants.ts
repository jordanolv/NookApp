export const TILE_SIZE = 32;
export const WORLD_COLS = 70;
export const WORLD_ROWS = 70;
export const WORLD_W = WORLD_COLS * TILE_SIZE;
export const WORLD_H = WORLD_ROWS * TILE_SIZE;
export const SPAWN_TILE_X = 35;
export const SPAWN_TILE_Y = 35;
export const WALL_THICKNESS = 4;

export const FLOOR_COLOR = 0xf3ead4;
export const WALL_COLOR = 0x2d2d2d;

export type Side = 'top' | 'bottom' | 'left' | 'right';

export function neighborOf(tx: number, ty: number, side: Side): [number, number] {
  switch (side) {
    case 'top':
      return [tx, ty - 1];
    case 'bottom':
      return [tx, ty + 1];
    case 'left':
      return [tx - 1, ty];
    case 'right':
      return [tx + 1, ty];
  }
}
