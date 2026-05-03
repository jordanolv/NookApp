import Phaser from 'phaser';
import { FLOOR_COLOR, TILE_SIZE } from './constants';
import type { MapModel } from './map-model';

export class FloorRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0);
  }

  apply(model: MapModel) {
    this.graphics.clear();
    this.graphics.fillStyle(FLOOR_COLOR, 1);
    for (const [tx, ty] of model.data.tiles) {
      this.graphics.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}
