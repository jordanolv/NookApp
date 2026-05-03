import Phaser from 'phaser';
import { FLOOR_COLOR, TILE_SIZE } from './constants';
import type { MapModel } from './map-model';

const HALF = TILE_SIZE / 2;

// Each wall cell quadrant peeks at its 3 corresponding neighbors (one orthogonal
// per side, one diagonal). If any is floor, we paint floor in that quadrant so
// the room's floor reaches up to the wall body without leaking into the grass.
const QUADRANTS: ReadonlyArray<{
  ox: number;
  oy: number;
  neighbors: ReadonlyArray<[number, number]>;
}> = [
  {
    ox: 0,
    oy: 0,
    neighbors: [
      [-1, 0],
      [0, -1],
      [-1, -1],
    ],
  },
  {
    ox: HALF,
    oy: 0,
    neighbors: [
      [1, 0],
      [0, -1],
      [1, -1],
    ],
  },
  {
    ox: 0,
    oy: HALF,
    neighbors: [
      [-1, 0],
      [0, 1],
      [-1, 1],
    ],
  },
  {
    ox: HALF,
    oy: HALF,
    neighbors: [
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
];

export class FloorRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0);
  }

  apply(model: MapModel) {
    this.graphics.clear();
    this.graphics.fillStyle(FLOOR_COLOR, 1);

    const explicit = new Set<string>();
    for (const [tx, ty] of model.data.tiles) {
      this.graphics.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      explicit.add(`${tx},${ty}`);
    }

    for (const item of model.data.items) {
      if (item.type !== 'wall') continue;
      if (explicit.has(`${item.x},${item.y}`)) continue;
      const cellLeft = item.x * TILE_SIZE;
      const cellTop = item.y * TILE_SIZE;
      for (const quad of QUADRANTS) {
        const facesFloor = quad.neighbors.some(([dx, dy]) =>
          model.hasFloor(item.x + dx, item.y + dy),
        );
        if (!facesFloor) continue;
        this.graphics.fillRect(cellLeft + quad.ox, cellTop + quad.oy, HALF, HALF);
      }
    }
  }
}
