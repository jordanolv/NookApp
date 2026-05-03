import Phaser from 'phaser';
import { TILE_SIZE, WORLD_H, WORLD_W } from './constants';

const GRASS_KEY = 'grass_tile';

function ensureGrassTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(GRASS_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x6fa766, 1);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(0x5e9659, 1);
  g.fillRect(8, 4, 2, 2);
  g.fillRect(20, 12, 2, 2);
  g.fillRect(4, 22, 2, 2);
  g.fillRect(24, 26, 2, 2);
  g.fillStyle(0x82b870, 1);
  g.fillRect(14, 6, 2, 2);
  g.fillRect(2, 14, 2, 2);
  g.fillRect(28, 18, 2, 2);
  g.generateTexture(GRASS_KEY, TILE_SIZE, TILE_SIZE);
  g.destroy();
}

export function drawGrassBackground(scene: Phaser.Scene) {
  ensureGrassTexture(scene);
  scene.add.tileSprite(0, 0, WORLD_W, WORLD_H, GRASS_KEY).setOrigin(0, 0).setDepth(-10);
}
