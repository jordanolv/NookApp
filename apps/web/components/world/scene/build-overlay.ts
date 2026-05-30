import Phaser from 'phaser';
import { TILE_SIZE, WORLD_COLS, WORLD_H, WORLD_ROWS, WORLD_W } from './constants';

export class BuildOverlay {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private active = false;

  constructor(scene: Phaser.Scene) {
    // Above world content (decor/walls sort by y) so the grid shows over buildings.
    this.graphics = scene.add.graphics().setDepth(9990);
    this.graphics.setVisible(false);
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.graphics.setVisible(active);
    this.redraw();
  }

  isActive() {
    return this.active;
  }

  private redraw() {
    this.graphics.clear();
    if (!this.active) return;
    this.graphics.lineStyle(1, 0x6366f1, 0.5);
    for (let x = 0; x <= WORLD_COLS; x++) {
      this.graphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_H);
    }
    for (let y = 0; y <= WORLD_ROWS; y++) {
      this.graphics.lineBetween(0, y * TILE_SIZE, WORLD_W, y * TILE_SIZE);
    }
  }
}
