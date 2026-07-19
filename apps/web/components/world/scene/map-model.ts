import {
  DEFAULT_MAP,
  type CollisionCell,
  type DecorObject,
  type FloorCell,
  type MapData,
  type WallCell,
} from '@nookapp/protocol';
import { getDecorAsset } from './decor-catalog';

function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

function normalizeMapData(data: MapData | null | undefined): MapData {
  const layers = data?.layers;
  return {
    width: data?.width ?? DEFAULT_MAP.width,
    height: data?.height ?? DEFAULT_MAP.height,
    spawn: data?.spawn ?? DEFAULT_MAP.spawn,
    layers: {
      floors: Array.isArray(layers?.floors) ? layers.floors : [],
      walls: Array.isArray(layers?.walls) ? layers.walls : [],
      decor: Array.isArray(layers?.decor) ? layers.decor : [],
      collision: Array.isArray(layers?.collision) ? layers.collision : [],
    },
  };
}

export class MapModel {
  readonly wallByCell: ReadonlyMap<string, WallCell>;
  readonly decorByCell: ReadonlyMap<string, DecorObject>;
  readonly floorByCell: ReadonlyMap<string, FloorCell>;
  readonly collisionByCell: ReadonlyMap<string, CollisionCell>;
  readonly data: MapData;

  constructor(data: MapData | null | undefined) {
    this.data = normalizeMapData(data);
    const wallByCell = new Map<string, WallCell>();
    const decorByCell = new Map<string, DecorObject>();
    const floorByCell = new Map<string, FloorCell>();
    const collisionByCell = new Map<string, CollisionCell>();

    for (const cell of this.data.layers.walls) wallByCell.set(tileKey(cell.x, cell.y), cell);
    for (const cell of this.data.layers.floors) floorByCell.set(tileKey(cell.x, cell.y), cell);
    for (const cell of this.data.layers.collision)
      collisionByCell.set(tileKey(cell.x, cell.y), cell);
    for (const item of this.data.layers.decor) {
      const def = getDecorAsset(item.asset);
      if (def) {
        for (const cell of def.cells) {
          decorByCell.set(tileKey(item.x + cell.dx, item.y + cell.dy), item);
        }
      } else {
        decorByCell.set(tileKey(item.x, item.y), item);
      }
    }

    this.wallByCell = wallByCell;
    this.decorByCell = decorByCell;
    this.floorByCell = floorByCell;
    this.collisionByCell = collisionByCell;
  }

  hasFloor(x: number, y: number): boolean {
    return this.floorByCell.has(tileKey(x, y));
  }

  hasWall(x: number, y: number): boolean {
    return this.wallByCell.has(tileKey(x, y));
  }

  hasCollision(x: number, y: number): boolean {
    return this.collisionByCell.has(tileKey(x, y));
  }

  wallAt(x: number, y: number): WallCell | undefined {
    return this.wallByCell.get(tileKey(x, y));
  }

  decorAt(x: number, y: number): DecorObject | undefined {
    return this.decorByCell.get(tileKey(x, y));
  }

  floorAt(x: number, y: number): FloorCell | undefined {
    return this.floorByCell.get(tileKey(x, y));
  }
}
