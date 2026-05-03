import type { MapData, Side } from '@nookapp/protocol';
import { neighborOf } from './constants';

function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

function doorKey(x: number, y: number, side: Side) {
  return `${x},${y},${side}`;
}

export class MapModel {
  readonly tilesSet: ReadonlySet<string>;
  readonly doorsSet: ReadonlySet<string>;

  constructor(public readonly data: MapData) {
    this.tilesSet = new Set(data.tiles.map(([x, y]) => tileKey(x, y)));
    this.doorsSet = new Set(
      data.items
        .filter((item) => item.type === 'door')
        .map((item) => doorKey(item.x, item.y, item.side)),
    );
  }

  hasFloor(x: number, y: number): boolean {
    return this.tilesSet.has(tileKey(x, y));
  }

  hasDoor(x: number, y: number, side: Side): boolean {
    return this.doorsSet.has(doorKey(x, y, side));
  }

  // True when (x, y) is a floor tile and the neighbor on `side` is grass —
  // i.e. there is a wall here unless a door cuts it.
  isExternalEdge(x: number, y: number, side: Side): boolean {
    if (!this.hasFloor(x, y)) return false;
    const [nx, ny] = neighborOf(x, y, side);
    return !this.hasFloor(nx, ny);
  }
}
