import type { MapData } from '@nookapp/protocol';

function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

export class MapModel {
  readonly tilesSet: ReadonlySet<string>;
  readonly wallsSet: ReadonlySet<string>;

  constructor(public readonly data: MapData) {
    this.tilesSet = new Set(data.tiles.map(([x, y]) => tileKey(x, y)));
    this.wallsSet = new Set(
      data.items.filter((item) => item.type === 'wall').map((item) => tileKey(item.x, item.y)),
    );
  }

  hasFloor(x: number, y: number): boolean {
    return this.tilesSet.has(tileKey(x, y));
  }

  hasWall(x: number, y: number): boolean {
    return this.wallsSet.has(tileKey(x, y));
  }
}
