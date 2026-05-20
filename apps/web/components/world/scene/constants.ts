export const TILE_SIZE = 32;
export const WORLD_COLS = 70;
export const WORLD_ROWS = 70;
export const WORLD_W = WORLD_COLS * TILE_SIZE;
export const WORLD_H = WORLD_ROWS * TILE_SIZE;
export const SPAWN_TILE_X = 35;
export const SPAWN_TILE_Y = 35;

export const FLOOR_COLOR = 0xf3ead4;

export const WALL_BORDER_COLOR = 0x2e2e3a;
export const WALL_BORDER_THICKNESS = 2;

// Visual zoom level — applied via Phaser's cam.setZoom so the camera renders
// the world at this magnification. The canvas fills its container 1:1 in CSS;
// no extra CSS transform. Kept as a constant so overlay math stays consistent.
export const DISPLAY_SCALE = 1.5;
