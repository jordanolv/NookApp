import Phaser from 'phaser';
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS } from './constants';

export type PaintMode = 'add' | 'remove';

export interface CellPaintResult {
  x: number;
  y: number;
  mode: PaintMode;
}

interface DragState {
  mode: PaintMode;
  lastX: number;
  lastY: number;
}

// Click-to-paint single cells. Drag paints every distinct cell the cursor
// crosses, all in the same mode (decided by the first cell: empty → add,
// occupied → remove). Used for the wall tool so users place walls one-by-one
// and naturally end up with straight runs.
export class CellPaintTool {
  private readonly hover: Phaser.GameObjects.Graphics;
  private drag: DragState | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly colors: { add: number; remove: number },
  ) {
    this.hover = scene.add.graphics().setDepth(9995);
  }

  begin(tx: number, ty: number, isPresent: boolean): CellPaintResult | null {
    if (!inBounds(tx, ty)) return null;
    const mode: PaintMode = isPresent ? 'remove' : 'add';
    this.drag = { mode, lastX: tx, lastY: ty };
    this.drawHover(tx, ty, mode);
    return { x: tx, y: ty, mode };
  }

  // Returns a result only when the cursor moves into a new cell while dragging.
  move(tx: number, ty: number, isPresent: boolean): CellPaintResult | null {
    if (!this.drag) {
      if (inBounds(tx, ty)) this.drawHover(tx, ty, isPresent ? 'remove' : 'add');
      else this.hover.clear();
      return null;
    }
    if (!inBounds(tx, ty)) return null;
    if (tx === this.drag.lastX && ty === this.drag.lastY) return null;
    this.drag.lastX = tx;
    this.drag.lastY = ty;
    this.drawHover(tx, ty, this.drag.mode);
    return { x: tx, y: ty, mode: this.drag.mode };
  }

  end() {
    this.drag = null;
  }

  cancel() {
    this.drag = null;
    this.hover.clear();
  }

  clearHover() {
    this.hover.clear();
  }

  private drawHover(tx: number, ty: number, mode: PaintMode) {
    const color = mode === 'add' ? this.colors.add : this.colors.remove;
    this.hover.clear();
    this.hover.fillStyle(color, 0.3);
    this.hover.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.hover.lineStyle(2, color, 0.85);
    this.hover.strokeRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
}

function inBounds(x: number, y: number) {
  return x >= 0 && y >= 0 && x < WORLD_COLS && y < WORLD_ROWS;
}
