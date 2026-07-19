import Phaser from 'phaser';
import { TILE_SIZE, WORLD_H, WORLD_W } from './constants';

const FALLBACK_KEY = 'grass_tile';
const KENNEY_GRASS_KEY = 'floor:tt:tile_0000';

function ensureFallbackTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(FALLBACK_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x6fa766, 1);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.generateTexture(FALLBACK_KEY, TILE_SIZE, TILE_SIZE);
  g.destroy();
}

export function drawGrassBackground(scene: Phaser.Scene) {
  if (scene.textures.exists(KENNEY_GRASS_KEY)) {
    const src = scene.textures.get(KENNEY_GRASS_KEY).getSourceImage() as { width?: number };
    const tileSize = src?.width ?? 16;
    const tile = scene.add
      .tileSprite(0, 0, WORLD_W, WORLD_H, KENNEY_GRASS_KEY)
      .setOrigin(0, 0)
      .setDepth(-10);
    const scale = TILE_SIZE / tileSize;
    tile.tileScaleX = scale;
    tile.tileScaleY = scale;
    return;
  }
  ensureFallbackTexture(scene);
  scene.add.tileSprite(0, 0, WORLD_W, WORLD_H, FALLBACK_KEY).setOrigin(0, 0).setDepth(-10);
}
