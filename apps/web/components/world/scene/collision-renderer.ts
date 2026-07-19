import Phaser from 'phaser';
import { TILE_SIZE } from './constants';
import type { MapModel } from './map-model';

// Manually painted impassable cells. Invisible in play; in the editor a red
// outline marks each blocked cell while the collision tool is active.
const OUTLINE_DEPTH = 10000;
const OUTLINE_COLOR = 0xef4444;

export class CollisionRenderer {
  private readonly group: Phaser.Physics.Arcade.StaticGroup;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private cells: ReadonlyArray<{ x: number; y: number }> = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.group = scene.physics.add.staticGroup();
    this.graphics = scene.add.graphics().setDepth(OUTLINE_DEPTH).setVisible(false);
  }

  collideWith(target: Phaser.GameObjects.GameObject) {
    return this.scene.physics.add.collider(target, this.group);
  }

  setOutlineVisible(visible: boolean) {
    this.graphics.setVisible(visible);
  }

  apply(model: MapModel) {
    this.cells = model.data.layers.collision;

    this.group.clear(true, true);
    for (const cell of this.cells) {
      const collider = this.scene.add.zone(
        cell.x * TILE_SIZE + TILE_SIZE / 2,
        cell.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE,
      );
      this.scene.physics.add.existing(collider, true);
      this.group.add(collider);
    }
    this.group.refresh();
    this.redraw();
  }

  private redraw() {
    this.graphics.clear();
    this.graphics.lineStyle(2, OUTLINE_COLOR, 0.9);
    this.graphics.fillStyle(OUTLINE_COLOR, 0.15);
    for (const cell of this.cells) {
      const x = cell.x * TILE_SIZE;
      const y = cell.y * TILE_SIZE;
      this.graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      this.graphics.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
  }

  destroy() {
    this.group.clear(true, true);
    this.graphics.destroy();
  }
}
