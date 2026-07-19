import Phaser from 'phaser';
import { TILE_SIZE } from './constants';
import type { MapModel } from './map-model';
import { WALL_SHEET, WALL_SHEET_TEXTURE_KEY } from './wall-catalog';

export const WALL_TEXTURE_KEYS: ReadonlyArray<{ key: string; url: string; isSheet: true }> = [
  { key: WALL_SHEET_TEXTURE_KEY, url: WALL_SHEET.url, isSheet: true as const },
];

const COLLIDER_INSET = 1;
type ColliderOrientation = 'horizontal' | 'vertical' | 'block';

export class WallRenderer {
  private readonly group: Phaser.Physics.Arcade.StaticGroup;
  // cellKey ("x,y") → sprite, so we can update incrementally.
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {
    this.group = this.scene.physics.add.staticGroup();
  }

  collideWith(target: Phaser.GameObjects.GameObject) {
    return this.scene.physics.add.collider(target, this.group);
  }

  apply(model: MapModel) {
    if (this.scene.textures.exists(WALL_SHEET_TEXTURE_KEY)) {
      const seen = new Set<string>();
      for (const wall of model.data.layers.walls) {
        const key = cellKey(wall.x, wall.y);
        seen.add(key);
        const left = wall.x * TILE_SIZE;
        const top = wall.y * TILE_SIZE;
        const existing = this.sprites.get(key);
        if (existing) {
          if (existing.frame.name !== String(wall.frame)) {
            existing.setFrame(wall.frame);
          }
        } else {
          const sprite = this.scene.add
            .image(left, top, WALL_SHEET_TEXTURE_KEY, wall.frame)
            .setOrigin(0, 0)
            .setDepth(top + TILE_SIZE);
          this.sprites.set(key, sprite);
        }
      }
      // Remove sprites for cells no longer in the model.
      for (const [key, sprite] of this.sprites) {
        if (!seen.has(key)) {
          sprite.destroy();
          this.sprites.delete(key);
        }
      }
    }

    // Colliders are still fully rebuilt — the run-grouping depends on neighbors
    // so a single cell change can affect surrounding cell groupings.
    this.group.clear(true, true);
    this.addSegmentColliders(model);
    this.group.refresh();
  }

  private addSegmentColliders(model: MapModel) {
    const horizontal = new Set<string>();
    const vertical = new Set<string>();
    const blocks: Array<{ x: number; y: number }> = [];

    for (const wall of model.data.layers.walls) {
      const key = cellKey(wall.x, wall.y);
      const orientation = colliderOrientation(model, wall.x, wall.y);
      if (orientation === 'horizontal') horizontal.add(key);
      else if (orientation === 'vertical') vertical.add(key);
      else blocks.push({ x: wall.x, y: wall.y });
    }

    this.addHorizontalRuns(horizontal);
    this.addVerticalRuns(vertical);

    for (const block of blocks) {
      this.addColliderRect(
        block.x * TILE_SIZE + COLLIDER_INSET,
        block.y * TILE_SIZE + COLLIDER_INSET,
        TILE_SIZE - COLLIDER_INSET * 2,
        TILE_SIZE - COLLIDER_INSET * 2,
      );
    }
  }

  private addHorizontalRuns(cells: Set<string>) {
    const seen = new Set<string>();
    for (const key of cells) {
      if (seen.has(key)) continue;
      const [startX, y] = parseCellKey(key);
      let endX = startX;
      while (cells.has(cellKey(endX + 1, y))) endX++;
      for (let x = startX; x <= endX; x++) seen.add(cellKey(x, y));
      this.addColliderRect(
        startX * TILE_SIZE + COLLIDER_INSET,
        y * TILE_SIZE + COLLIDER_INSET,
        (endX - startX + 1) * TILE_SIZE - COLLIDER_INSET * 2,
        TILE_SIZE - COLLIDER_INSET * 2,
      );
    }
  }

  private addVerticalRuns(cells: Set<string>) {
    const seen = new Set<string>();
    for (const key of cells) {
      if (seen.has(key)) continue;
      const [x, startY] = parseCellKey(key);
      let endY = startY;
      while (cells.has(cellKey(x, endY + 1))) endY++;
      for (let y = startY; y <= endY; y++) seen.add(cellKey(x, y));
      this.addColliderRect(
        x * TILE_SIZE + COLLIDER_INSET,
        startY * TILE_SIZE + COLLIDER_INSET,
        TILE_SIZE - COLLIDER_INSET * 2,
        (endY - startY + 1) * TILE_SIZE - COLLIDER_INSET * 2,
      );
    }
  }

  private addColliderRect(x: number, y: number, width: number, height: number) {
    const collider = this.scene.add.zone(x + width / 2, y + height / 2, width, height);
    this.scene.physics.add.existing(collider, true);
    this.group.add(collider);
  }
}

function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

function parseCellKey(key: string): [number, number] {
  const [x, y] = key.split(',').map(Number);
  return [x!, y!];
}

function colliderOrientation(model: MapModel, x: number, y: number): ColliderOrientation {
  const n = model.hasWall(x, y - 1);
  const s = model.hasWall(x, y + 1);
  const e = model.hasWall(x + 1, y);
  const w = model.hasWall(x - 1, y);
  if ((e || w) && !n && !s) return 'horizontal';
  if ((n || s) && !e && !w) return 'vertical';
  return 'block';
}
