// LimeZu Modern Interiors — Room Builder 3D Walls (pseudo-3D with cap+body+band).
// 32×32 tiles, 24 cols × 59 rows = 1416 frames total.
// License: full commercial use, credit "limezu.itch.io" required.

export const WALL_SHEET = {
  url: '/assets/build/walls/limezu-3d-walls.png',
  cols: 24,
  rows: 59,
} as const;

export const WALL_SHEET_TEXTURE_KEY = 'wall-sheet:limezu-3d-walls';
export const WALL_SHEET_FRAMES = WALL_SHEET.cols * WALL_SHEET.rows;

// Helper: frame index at sheet position (col, row).
export function wallFrameAt(col: number, row: number): number {
  return row * WALL_SHEET.cols + col;
}

export function isValidWallFrame(frame: number): boolean {
  return Number.isInteger(frame) && frame >= 0 && frame < WALL_SHEET_FRAMES;
}

// Room themes: each theme is an 8×7 block in the LimeZu 3D walls sheet.
// stampRoom() uses theme-relative offsets to compose a rectangular room.
export interface RoomTheme {
  id: string;
  label: string;
  colOffset: number;
  rowOffset: number;
}

export const ROOM_THEMES: ReadonlyArray<RoomTheme> = [
  { id: 'wood', label: 'Bois', colOffset: 0, rowOffset: 0 },
  { id: 'drywall', label: 'Drywall gris', colOffset: 8, rowOffset: 0 },
  { id: 'light-blue', label: 'Bleu clair', colOffset: 16, rowOffset: 0 },
  { id: 'brick', label: 'Brique', colOffset: 0, rowOffset: 7 },
];

export const DEFAULT_ROOM_THEME_ID = 'drywall';

export function getRoomTheme(id: string): RoomTheme | undefined {
  return ROOM_THEMES.find((t) => t.id === id);
}
