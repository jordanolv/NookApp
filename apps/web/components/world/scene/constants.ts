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

// CSS scale factor applied to the Phaser canvas in NookWorld.vue. Phaser's
// camera runs at zoom 1 (pixel-perfect rendering), the browser upscales the
// whole canvas by this factor. Overlays project canvas pixels × DISPLAY_SCALE
// to land at the right viewport position above their world target.
export const DISPLAY_SCALE = 1.5;
