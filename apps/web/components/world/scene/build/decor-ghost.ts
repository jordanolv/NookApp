import Phaser from 'phaser';
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS } from '../constants';
import { getDecorAsset } from '../decor-catalog';
import { decorCellTextureKey } from '../decor-renderer';

// Faded preview of the decor under the cursor before you place it.
export class DecorGhost {
  private images: Phaser.GameObjects.Image[] = [];
  private decorId: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  setDecor(decorId: string | null) {
    this.decorId = decorId;
    this.rebuild();
  }

  update(tx: number, ty: number) {
    if (!this.images.length) this.rebuild();
    const asset = this.decorId ? getDecorAsset(this.decorId) : undefined;
    if (!asset) return;
    if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) {
      this.hide();
      return;
    }
    for (let i = 0; i < this.images.length; i++) {
      const cell = asset.cells[i]!;
      const cx = (tx + cell.dx) * TILE_SIZE + TILE_SIZE / 2;
      const cy = (ty + cell.dy) * TILE_SIZE + TILE_SIZE;
      this.images[i]!.setPosition(cx, cy).setDepth(9996).setVisible(true);
    }
  }

  hide() {
    for (const img of this.images) img.setVisible(false);
  }

  private rebuild() {
    for (const img of this.images) img.destroy();
    this.images = [];
    const asset = this.decorId ? getDecorAsset(this.decorId) : undefined;
    if (!asset) return;
    for (const cell of asset.cells) {
      const key = decorCellTextureKey(asset.id, cell.dx, cell.dy);
      if (!this.scene.textures.exists(key)) continue;
      this.images.push(
        this.scene.add
          .image(0, 0, key)
          .setOrigin(0.5, 1)
          .setScale(2)
          .setAlpha(0.55)
          .setDepth(99999)
          .setVisible(false),
      );
    }
  }
}
