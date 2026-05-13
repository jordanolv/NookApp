import Phaser from 'phaser';
import { TILE_SIZE, WALL_BORDER_COLOR, WALL_BORDER_THICKNESS } from './constants';
import type { MapModel } from './map-model';

const WALL_BASE_TEXTURE = 'wall_base';

interface Neighbors {
  // true when the neighbor is grass (no wall and no floor). Only those edges
  // get a dark border — wall-to-wall edges stay seamless, wall-to-floor edges
  // stay borderless so the wall fill flows softly into the room.
  ngrass: boolean;
  sgrass: boolean;
  egrass: boolean;
  wgrass: boolean;
}

function neighborKey(n: Neighbors): string {
  const suffix = `${n.ngrass ? 'N' : ''}${n.sgrass ? 'S' : ''}${n.egrass ? 'E' : ''}${n.wgrass ? 'W' : ''}`;
  return `wall_${suffix || 'I'}`;
}

function ensureWallTexture(scene: Phaser.Scene, neighbors: Neighbors): string {
  const key = neighborKey(neighbors);
  if (scene.textures.exists(key)) return key;

  // Compose the LimeZu base tile + the procedural dark border on a RenderTexture,
  // then snapshot it under `key` so each unique NSEW combo is built only once.
  const rt = scene.make.renderTexture({ width: TILE_SIZE, height: TILE_SIZE }, false);
  rt.draw(WALL_BASE_TEXTURE, 0, 0);

  const b = WALL_BORDER_THICKNESS;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(WALL_BORDER_COLOR, 1);
  if (neighbors.ngrass) g.fillRect(0, 0, TILE_SIZE, b);
  if (neighbors.sgrass) g.fillRect(0, TILE_SIZE - b, TILE_SIZE, b);
  if (neighbors.wgrass) g.fillRect(0, 0, b, TILE_SIZE);
  if (neighbors.egrass) g.fillRect(TILE_SIZE - b, 0, b, TILE_SIZE);
  rt.draw(g);
  g.destroy();

  rt.saveTexture(key);
  rt.destroy();
  return key;
}

export class WallRenderer {
  private readonly group: Phaser.Physics.Arcade.StaticGroup;
  private sprites: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.group = scene.physics.add.staticGroup();
  }

  collideWith(target: Phaser.GameObjects.GameObject) {
    return this.scene.physics.add.collider(target, this.group);
  }

  apply(model: MapModel) {
    this.group.clear(true, true);
    for (const sprite of this.sprites) sprite.destroy();
    this.sprites = [];

    for (const item of model.data.items) {
      if (item.type !== 'wall') continue;
      this.spawnWall(model, item.x, item.y);
    }
  }

  private spawnWall(model: MapModel, tx: number, ty: number) {
    const isGrass = (x: number, y: number) => !model.hasWall(x, y) && !model.hasFloor(x, y);
    const neighbors: Neighbors = {
      ngrass: isGrass(tx, ty - 1),
      sgrass: isGrass(tx, ty + 1),
      egrass: isGrass(tx + 1, ty),
      wgrass: isGrass(tx - 1, ty),
    };
    const textureKey = ensureWallTexture(this.scene, neighbors);
    const cellLeft = tx * TILE_SIZE;
    const cellTop = ty * TILE_SIZE;
    const cellBottom = cellTop + TILE_SIZE;

    this.sprites.push(
      this.scene.add.image(cellLeft, cellTop, textureKey).setOrigin(0, 0).setDepth(cellBottom),
    );

    const collider = this.scene.add.zone(
      cellLeft + TILE_SIZE / 2,
      cellBottom - TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
    );
    this.scene.physics.add.existing(collider, true);
    this.group.add(collider);
  }
}
