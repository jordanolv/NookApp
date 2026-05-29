import Phaser from 'phaser';
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS } from '../constants';
import { WALL_SHEET, WALL_SHEET_TEXTURE_KEY } from '../wall-catalog';
import type { WallRegion } from '../types';

// Faded preview of the wall piece under the cursor before you place it.
export class WallGhost {
  private images: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  update(tx: number, ty: number, region: WallRegion) {
    if (!this.scene.textures.exists(WALL_SHEET_TEXTURE_KEY)) return;
    const needed = region.w * region.h;
    while (this.images.length < needed) {
      this.images.push(
        this.scene.add
          .image(0, 0, WALL_SHEET_TEXTURE_KEY, 0)
          .setOrigin(0, 0)
          .setAlpha(0.55)
          .setDepth(20000),
      );
    }
    while (this.images.length > needed) this.images.pop()!.destroy();

    if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) {
      this.hide();
      return;
    }
    let i = 0;
    for (let dy = 0; dy < region.h; dy += 1) {
      for (let dx = 0; dx < region.w; dx += 1) {
        const frame = (region.row + dy) * WALL_SHEET.cols + (region.col + dx);
        this.images[i]!.setFrame(frame)
          .setPosition((tx + dx) * TILE_SIZE, (ty + dy) * TILE_SIZE)
          .setVisible(true);
        i += 1;
      }
    }
  }

  hide() {
    for (const img of this.images) img.setVisible(false);
  }
}
