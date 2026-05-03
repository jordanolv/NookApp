import Phaser from 'phaser';
import { TILE_SIZE, WALL_COLOR, WALL_THICKNESS, type Side } from './constants';
import type { MapModel } from './map-model';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectForSide(tx: number, ty: number, side: Side): Rect {
  const px = tx * TILE_SIZE;
  const py = ty * TILE_SIZE;
  switch (side) {
    case 'top':
      return { x: px, y: py, w: TILE_SIZE, h: WALL_THICKNESS };
    case 'bottom':
      return { x: px, y: py + TILE_SIZE - WALL_THICKNESS, w: TILE_SIZE, h: WALL_THICKNESS };
    case 'left':
      return { x: px, y: py, w: WALL_THICKNESS, h: TILE_SIZE };
    case 'right':
      return { x: px + TILE_SIZE - WALL_THICKNESS, y: py, w: WALL_THICKNESS, h: TILE_SIZE };
  }
}

const SIDES: Side[] = ['top', 'bottom', 'left', 'right'];

export class WallRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly group: Phaser.Physics.Arcade.StaticGroup;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0.3);
    this.group = scene.physics.add.staticGroup();
  }

  collideWith(target: Phaser.GameObjects.GameObject) {
    return this.scene.physics.add.collider(target, this.group);
  }

  apply(model: MapModel) {
    this.graphics.clear();
    this.group.clear(true, true);
    this.graphics.fillStyle(WALL_COLOR, 1);

    for (const [tx, ty] of model.data.tiles) {
      for (const side of SIDES) {
        if (!model.isExternalEdge(tx, ty, side)) continue;
        if (model.hasDoor(tx, ty, side)) continue;
        const rect = rectForSide(tx, ty, side);
        this.graphics.fillRect(rect.x, rect.y, rect.w, rect.h);
        this.addCollider(rect);
      }
    }
  }

  private addCollider(rect: Rect) {
    const zone = this.scene.add.zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h);
    this.scene.physics.add.existing(zone, true);
    this.group.add(zone);
  }
}
