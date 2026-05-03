import Phaser from 'phaser';
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS } from './constants';

export type PaintMode = 'add' | 'remove';

export interface PaintRectResult {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mode: PaintMode;
}

interface DragState {
  startX: number;
  startY: number;
  mode: PaintMode;
}

export interface RectPaintColors {
  add: number;
  remove: number;
}

// Generic drag-to-paint rectangle: the start cell decides the mode (add when
// the cell is empty, remove when it already holds whatever the caller paints).
// Used for both floor tiles and walls — caller passes hasItemAt(x, y) to query
// the underlying layer.
export class RectPaintTool {
  private readonly preview: Phaser.GameObjects.Graphics;
  private drag: DragState | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly colors: RectPaintColors,
  ) {
    this.preview = scene.add.graphics().setDepth(21);
  }

  beginDrag(tx: number, ty: number, isPresent: boolean) {
    if (!isInBounds(tx, ty)) return;
    this.drag = {
      startX: tx,
      startY: ty,
      mode: isPresent ? 'remove' : 'add',
    };
    this.drawPreview(tx, ty);
  }

  updateDrag(tx: number, ty: number) {
    if (!this.drag) return;
    this.drawPreview(tx, ty);
  }

  endDrag(tx: number, ty: number): PaintRectResult | null {
    const drag = this.drag;
    this.drag = null;
    this.preview.clear();
    if (!drag) return null;
    return {
      x1: drag.startX,
      y1: drag.startY,
      x2: clamp(tx, 0, WORLD_COLS - 1),
      y2: clamp(ty, 0, WORLD_ROWS - 1),
      mode: drag.mode,
    };
  }

  cancel() {
    this.drag = null;
    this.preview.clear();
  }

  private drawPreview(curX: number, curY: number) {
    if (!this.drag) return;
    const cx = clamp(curX, 0, WORLD_COLS - 1);
    const cy = clamp(curY, 0, WORLD_ROWS - 1);
    const minX = Math.min(this.drag.startX, cx);
    const maxX = Math.max(this.drag.startX, cx);
    const minY = Math.min(this.drag.startY, cy);
    const maxY = Math.max(this.drag.startY, cy);
    const color = this.drag.mode === 'add' ? this.colors.add : this.colors.remove;
    this.preview.clear();
    this.preview.fillStyle(color, 0.25);
    this.preview.fillRect(
      minX * TILE_SIZE,
      minY * TILE_SIZE,
      (maxX - minX + 1) * TILE_SIZE,
      (maxY - minY + 1) * TILE_SIZE,
    );
    this.preview.lineStyle(2, color, 0.85);
    this.preview.strokeRect(
      minX * TILE_SIZE,
      minY * TILE_SIZE,
      (maxX - minX + 1) * TILE_SIZE,
      (maxY - minY + 1) * TILE_SIZE,
    );
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isInBounds(x: number, y: number) {
  return x >= 0 && y >= 0 && x < WORLD_COLS && y < WORLD_ROWS;
}
