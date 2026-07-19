import Phaser from 'phaser';
import { FLOOR_COLOR, TILE_SIZE } from './constants';
import type { MapModel } from './map-model';

const FLOOR_DEPTH = 0;

export class FloorRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private floorSprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(FLOOR_DEPTH);
  }

  apply(model: MapModel) {
    this.graphics.clear();
    this.graphics.fillStyle(FLOOR_COLOR, 1);

    const seen = new Set<string>();
    for (const [key, item] of model.floorByCell) {
      if (model.hasWall(item.x, item.y)) continue;
      seen.add(key);
      if (item.asset === 'default') {
        const existing = this.floorSprites.get(key);
        if (existing) {
          existing.destroy();
          this.floorSprites.delete(key);
        }
        this.graphics.fillRect(item.x * TILE_SIZE, item.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        continue;
      }
      const textureKey = `floor:${item.asset}`;
      if (!this.scene.textures.exists(textureKey)) continue;
      this.scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const left = item.x * TILE_SIZE;
      const top = item.y * TILE_SIZE;
      const existing = this.floorSprites.get(key);
      if (existing) {
        existing.setTexture(textureKey);
        existing.setPosition(left, top);
        scaleFloorSprite(this.scene, existing, textureKey);
      } else {
        const sprite = this.scene.add
          .image(left, top, textureKey)
          .setOrigin(0, 0)
          .setDepth(FLOOR_DEPTH + 0.1);
        scaleFloorSprite(this.scene, sprite, textureKey);
        this.floorSprites.set(key, sprite);
      }
    }
    for (const [key, sprite] of this.floorSprites) {
      if (!seen.has(key)) {
        sprite.destroy();
        this.floorSprites.delete(key);
      }
    }
  }
}

function scaleFloorSprite(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image,
  textureKey: string,
) {
  const source = scene.textures.get(textureKey).getSourceImage() as {
    width?: number;
    height?: number;
  };
  sprite.setScale(
    TILE_SIZE / (source.width ?? TILE_SIZE),
    TILE_SIZE / (source.height ?? TILE_SIZE),
  );
}
