import Phaser from 'phaser';
import { TILE_SIZE } from './constants';
import { getDecorAsset } from './decor-catalog';
import type { MapModel } from './map-model';

const SCALE = 2;

export function decorCellTextureKey(decorId: string, dx: number, dy: number) {
  return `decor:${decorId}:${dx},${dy}`;
}

export class DecorRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly group: Phaser.Physics.Arcade.StaticGroup;

  constructor(private readonly scene: Phaser.Scene) {
    this.group = scene.physics.add.staticGroup();
  }

  collideWith(target: Phaser.GameObjects.GameObject) {
    return this.scene.physics.add.collider(target, this.group);
  }

  apply(model: MapModel) {
    this.group.clear(true, true);

    const seen = new Set<string>();
    for (const item of model.data.layers.decor) {
      seen.add(item.id);
      const asset = getDecorAsset(item.asset);
      if (!asset) continue;

      const existing = this.sprites.get(item.id);
      const reuseable = existing && existing.length === asset.cells.length ? existing : null;
      if (existing && !reuseable) {
        for (const s of existing) s.destroy();
      }
      const list: Phaser.GameObjects.Image[] = reuseable ?? [];

      for (let i = 0; i < asset.cells.length; i++) {
        const cell = asset.cells[i]!;
        const textureKey = decorCellTextureKey(asset.id, cell.dx, cell.dy);
        if (!this.scene.textures.exists(textureKey)) continue;
        const cellLeft = (item.x + cell.dx) * TILE_SIZE;
        const cellTop = (item.y + cell.dy) * TILE_SIZE;
        const cellBottom = cellTop + TILE_SIZE;
        const cx = cellLeft + TILE_SIZE / 2;
        const cy = cellBottom;
        const prev = list[i];
        if (prev) {
          prev.setTexture(textureKey);
          prev.setPosition(cx, cy);
          prev.setDepth(cy);
        } else {
          list[i] = this.scene.add
            .image(cx, cy, textureKey)
            .setOrigin(0.5, 1)
            .setScale(SCALE)
            .setDepth(cy);
        }

        const collider = this.scene.add.zone(
          cellLeft + TILE_SIZE / 2,
          cellTop + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
        );
        this.scene.physics.add.existing(collider, true);
        this.group.add(collider);
      }
      this.sprites.set(item.id, list);
    }
    for (const [id, list] of this.sprites) {
      if (!seen.has(id)) {
        for (const s of list) s.destroy();
        this.sprites.delete(id);
      }
    }

    this.group.refresh();
  }

  destroy() {
    for (const list of this.sprites.values()) for (const s of list) s.destroy();
    this.sprites.clear();
    this.group.clear(true, true);
  }
}
