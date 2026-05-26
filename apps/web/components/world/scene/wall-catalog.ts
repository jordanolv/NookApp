// LimeZu Room_Builder 3D walls — one big spritesheet with multiple themes.
// User picks any frame in the picker and paints it case-by-case. No autotile.
//
// Pre-designed room templates live in `room-templates.ts` and are stamped at
// click position by the Room tool.

export const WALL_SHEET = {
  url: '/assets/build/walls/limezu/room-builder-3d-walls-32.png',
  cols: 24,
  rows: 59,
  themeWidth: 8,
  themeHeight: 7,
} as const;

export const WALL_SHEET_FRAMES = WALL_SHEET.cols * WALL_SHEET.rows;
export const WALL_SHEET_TEXTURE_KEY = 'wall-sheet:room-builder-3d-walls';

export const DEFAULT_WALL_FRAME = 33;
const ROOM_COMPATIBLE_THEME_ROWS = new Set([0, 7, 14, 21, 28, 35]);

export interface WallThemeBlock {
  col: number;
  row: number;
}

function frameTheme(frame: number): WallThemeBlock {
  const col = frame % WALL_SHEET.cols;
  const row = Math.floor(frame / WALL_SHEET.cols);
  return {
    col: Math.floor(col / WALL_SHEET.themeWidth) * WALL_SHEET.themeWidth,
    row: Math.floor(row / WALL_SHEET.themeHeight) * WALL_SHEET.themeHeight,
  };
}

function isRoomCompatibleTheme(theme: WallThemeBlock): boolean {
  return (
    theme.col >= 0 &&
    theme.row >= 0 &&
    theme.col + WALL_SHEET.themeWidth <= WALL_SHEET.cols &&
    theme.row + WALL_SHEET.themeHeight <= WALL_SHEET.rows &&
    ROOM_COMPATIBLE_THEME_ROWS.has(theme.row)
  );
}

export const WALL_THEMES: ReadonlyArray<WallThemeBlock> = (() => {
  const themes: WallThemeBlock[] = [];
  const themesPerRow = Math.floor(WALL_SHEET.cols / WALL_SHEET.themeWidth);
  const themesPerCol = Math.floor(WALL_SHEET.rows / WALL_SHEET.themeHeight);
  for (let tr = 0; tr < themesPerCol; tr += 1) {
    for (let tc = 0; tc < themesPerRow; tc += 1) {
      const theme = {
        col: tc * WALL_SHEET.themeWidth,
        row: tr * WALL_SHEET.themeHeight,
      };
      if (isRoomCompatibleTheme(theme)) themes.push(theme);
    }
  }
  return themes;
})();

export function themeOfFrame(frame: number): WallThemeBlock {
  const theme = frameTheme(frame);
  return isRoomCompatibleTheme(theme) ? theme : frameTheme(DEFAULT_WALL_FRAME);
}

export function normalizeWallFrame(frame: number): number {
  if (!isValidWallFrame(frame)) return DEFAULT_WALL_FRAME;
  return isRoomCompatibleTheme(frameTheme(frame)) ? frame : DEFAULT_WALL_FRAME;
}

export function isValidWallFrame(frame: number): boolean {
  return Number.isInteger(frame) && frame >= 0 && frame < WALL_SHEET_FRAMES;
}

export interface RoomStampCell {
  x: number;
  y: number;
  frame: number;
}

/**
 * Compose a room rectangle from a theme block. Same offsets as poc-phaser:
 *   y=0     cap top:    (1,1) | (3,2) | (4,2)×N | (6,1)
 *   y=1     back body:  (1,3) | (3,3)×N         | (6,3)
 *   y=2..H-2 sides:     (1,5) left              | (6,5) right
 *   y=H-1   bottom:     (2,5) | (3,5)×N         | (5,5)
 * Requires w >= 3, h >= 4.
 *
 * The room is rendered one cell taller than the requested h — LimeZu front-wall
 * sprites occupy only the top half of their cell, so the extra row makes the
 * visible wall sit at the bottom of the user's intended bounding box.
 */
export function stampRoomCells(
  x: number,
  y: number,
  w: number,
  h: number,
  theme: WallThemeBlock,
): RoomStampCell[] {
  if (w < 3 || h < 4) return [];
  const out: RoomStampCell[] = [];
  const f = (cc: number, rr: number) => (theme.row + rr) * WALL_SHEET.cols + (theme.col + cc);
  const x2 = x + w - 1;
  const y2 = y + h;

  out.push({ x, y, frame: f(1, 1) });
  out.push({ x: x2, y, frame: f(6, 1) });
  out.push({ x: x + 1, y, frame: f(3, 2) });
  for (let xx = x + 2; xx <= x2 - 1; xx += 1) out.push({ x: xx, y, frame: f(4, 2) });

  out.push({ x, y: y + 1, frame: f(1, 3) });
  out.push({ x: x2, y: y + 1, frame: f(6, 3) });
  for (let xx = x + 1; xx <= x2 - 1; xx += 1) out.push({ x: xx, y: y + 1, frame: f(3, 3) });

  for (let yy = y + 2; yy <= y2 - 1; yy += 1) {
    out.push({ x, y: yy, frame: f(1, 5) });
    out.push({ x: x2, y: yy, frame: f(6, 5) });
  }

  out.push({ x, y: y2, frame: f(2, 5) });
  out.push({ x: x2, y: y2, frame: f(5, 5) });
  for (let xx = x + 1; xx <= x2 - 1; xx += 1) out.push({ x: xx, y: y2, frame: f(3, 5) });

  return out;
}
