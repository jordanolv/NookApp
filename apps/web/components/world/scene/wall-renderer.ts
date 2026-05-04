import Phaser from 'phaser';
import {
  TILE_SIZE,
  WALL_FRONT_COLOR,
  WALL_HIGHLIGHT_COLOR,
  WALL_SHADOW_COLOR,
  WALL_TOP_COLOR,
} from './constants';
import type { MapModel } from './map-model';

const WALL_THICKNESS = 16;
const HALF_THICKNESS = WALL_THICKNESS / 2;
const TOP_FACE_HEIGHT = 8;
const CENTER = TILE_SIZE / 2;
const BODY_LEFT = CENTER - HALF_THICKNESS;
const BODY_RIGHT = CENTER + HALF_THICKNESS;
const BODY_TOP = CENTER - HALF_THICKNESS;
const BODY_BOTTOM = CENTER + HALF_THICKNESS;

interface Neighbors {
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
}

function neighborKey({ n, s, e, w }: Neighbors): string {
  const k = `${n ? 'N' : ''}${s ? 'S' : ''}${e ? 'E' : ''}${w ? 'W' : ''}`;
  return `wall_${k || 'I'}`;
}

// Renders the wall as a center body plus arms reaching out to each connected
// neighbor, with a light top face above any exposed top edge. The top edges of
// arms that connect to a wall above (N arm) are interior and skipped, which
// keeps a vertical run visually continuous instead of dashed.
function ensureWallTexture(scene: Phaser.Scene, neighbors: Neighbors): string {
  const key = neighborKey(neighbors);
  if (scene.textures.exists(key)) return key;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Front face — center body and the four arms.
  g.fillStyle(WALL_FRONT_COLOR, 1);
  g.fillRect(BODY_LEFT, BODY_TOP, WALL_THICKNESS, WALL_THICKNESS);
  if (neighbors.n) g.fillRect(BODY_LEFT, 0, WALL_THICKNESS, BODY_TOP);
  if (neighbors.s) g.fillRect(BODY_LEFT, BODY_BOTTOM, WALL_THICKNESS, TILE_SIZE - BODY_BOTTOM);
  if (neighbors.e) g.fillRect(BODY_RIGHT, BODY_TOP, TILE_SIZE - BODY_RIGHT, WALL_THICKNESS);
  if (neighbors.w) g.fillRect(0, BODY_TOP, BODY_LEFT, WALL_THICKNESS);

  // Top face — drawn above each horizontal top edge of the body that isn't
  // covered by an N arm continuing into the wall above.
  g.fillStyle(WALL_TOP_COLOR, 1);
  if (!neighbors.n) {
    g.fillRect(BODY_LEFT, BODY_TOP - TOP_FACE_HEIGHT, WALL_THICKNESS, TOP_FACE_HEIGHT);
  }
  if (neighbors.e) {
    g.fillRect(BODY_RIGHT, BODY_TOP - TOP_FACE_HEIGHT, TILE_SIZE - BODY_RIGHT, TOP_FACE_HEIGHT);
  }
  if (neighbors.w) {
    g.fillRect(0, BODY_TOP - TOP_FACE_HEIGHT, BODY_LEFT, TOP_FACE_HEIGHT);
  }

  // 1-px highlight at the top of the body (joint between top face and front face).
  g.fillStyle(WALL_HIGHLIGHT_COLOR, 1);
  if (!neighbors.n) g.fillRect(BODY_LEFT, BODY_TOP, WALL_THICKNESS, 1);
  if (neighbors.e) g.fillRect(BODY_RIGHT, BODY_TOP, TILE_SIZE - BODY_RIGHT, 1);
  if (neighbors.w) g.fillRect(0, BODY_TOP, BODY_LEFT, 1);

  // 1-px shadow at the bottom of the body where exposed (no S arm continuing).
  g.fillStyle(WALL_SHADOW_COLOR, 1);
  if (!neighbors.s) g.fillRect(BODY_LEFT, BODY_BOTTOM - 1, WALL_THICKNESS, 1);
  if (neighbors.e) g.fillRect(BODY_RIGHT, BODY_BOTTOM - 1, TILE_SIZE - BODY_RIGHT, 1);
  if (neighbors.w) g.fillRect(0, BODY_BOTTOM - 1, BODY_LEFT, 1);

  g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  g.destroy();
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
    const neighbors: Neighbors = {
      n: model.hasWall(tx, ty - 1),
      s: model.hasWall(tx, ty + 1),
      e: model.hasWall(tx + 1, ty),
      w: model.hasWall(tx - 1, ty),
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
