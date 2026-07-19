import Phaser from 'phaser';
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS } from '../constants';
import { getDecorAsset } from '../decor-catalog';
import type { MapModel } from '../map-model';
import { RectPaintTool } from '../rect-paint-tool';
import type { BuildOverlay } from '../build-overlay';
import type {
  BuildTool,
  CellErasePayload,
  CollisionRectPayload,
  DecorPlacePayload,
  DecorRemovePayload,
  RoomRectPayload,
  WallRectPayload,
  WallRegion,
} from '../types';
import { DecorGhost } from './decor-ghost';
import { WallGhost } from './wall-ghost';

const DEFAULT_FLOOR = 'office_floor_light';

// Turns mouse drags in the editor into build actions (paint tiles, walls, rooms,
// place/remove decor, erase) and sends them out as scene events.
export class BuildController {
  private tool: BuildTool = 'tile';
  private selectedFloor = DEFAULT_FLOOR;
  private selectedWallRegion: WallRegion = { col: 0, row: 0, w: 1, h: 1 };
  private selectedDecor: string | null = null;
  private eraseDragLastTile: { x: number; y: number } | null = null;

  private readonly tilePaint: RectPaintTool;
  private readonly wallPaint: RectPaintTool;
  private readonly roomPaint: RectPaintTool;
  private readonly collisionPaint: RectPaintTool;
  private readonly decorGhost: DecorGhost;
  private readonly wallGhost: WallGhost;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly buildOverlay: BuildOverlay,
    private readonly getModel: () => MapModel | null,
  ) {
    this.tilePaint = new RectPaintTool(scene, { add: 0x6366f1, remove: 0xef4444 });
    this.wallPaint = new RectPaintTool(scene, { add: 0x9a9a9a, remove: 0xef4444 });
    this.collisionPaint = new RectPaintTool(scene, { add: 0xef4444, remove: 0x9a9a9a });
    this.roomPaint = new RectPaintTool(
      scene,
      { add: 0x4ec9b0, remove: 0xef4444 },
      { shape: 'outline' },
    );
    this.decorGhost = new DecorGhost(scene);
    this.wallGhost = new WallGhost(scene);
  }

  get currentTool(): BuildTool {
    return this.tool;
  }

  setTool(tool: BuildTool) {
    if (this.tool === tool) return;
    this.tool = tool;
    this.tilePaint.cancel();
    this.wallPaint.cancel();
    this.roomPaint.cancel();
    this.collisionPaint.cancel();
    if (tool !== 'decor') this.decorGhost.hide();
    if (tool !== 'wall') this.wallGhost.hide();
  }

  setSelectedFloor(assetId: string) {
    this.selectedFloor = assetId || DEFAULT_FLOOR;
  }

  setSelectedWallRegion(region: WallRegion) {
    if (region && region.w > 0 && region.h > 0) this.selectedWallRegion = region;
  }

  setSelectedDecor(assetId: string | null) {
    this.selectedDecor = assetId;
    this.decorGhost.setDecor(assetId);
  }

  onExitBuild() {
    this.tilePaint.cancel();
    this.collisionPaint.cancel();
    this.decorGhost.hide();
    this.wallGhost.hide();
  }

  onPointerDown(pointer: Phaser.Input.Pointer) {
    const model = this.getModel();
    if (!this.isActive() || !model) return;
    const [tx, ty] = pointerToTile(pointer);
    if (isOutOfBounds(tx, ty)) return;

    if (this.tool === 'decor') {
      this.placeOrRemoveDecor(model, tx, ty);
      return;
    }
    if (this.tool === 'tile') {
      this.tilePaint.beginDrag(tx, ty, this.isFloorPresentAt(model, tx, ty));
      return;
    }
    if (this.tool === 'wall') {
      this.wallPaint.beginDrag(tx, ty, model.hasWall(tx, ty));
      return;
    }
    if (this.tool === 'collision') {
      this.collisionPaint.beginDrag(tx, ty, model.hasCollision(tx, ty));
      return;
    }
    if (this.tool === 'room') {
      this.roomPaint.beginDrag(tx, ty, false);
      return;
    }
    if (this.tool === 'erase') {
      this.eraseDragLastTile = { x: tx, y: ty };
      this.scene.events.emit('cell-erase', { x: tx, y: ty } satisfies CellErasePayload);
    }
  }

  onPointerMove(pointer: Phaser.Input.Pointer) {
    const [tx, ty] = pointerToTile(pointer);
    if (this.tool === 'decor' && this.isActive()) {
      this.decorGhost.update(tx, ty);
      return;
    }
    if (this.tool === 'tile') {
      this.tilePaint.updateDrag(tx, ty);
      return;
    }
    if (this.tool === 'collision') {
      this.collisionPaint.updateDrag(tx, ty);
      return;
    }
    if (this.tool === 'wall' && this.isActive()) {
      this.wallPaint.updateDrag(tx, ty);
      this.wallGhost.update(tx, ty, this.selectedWallRegion);
      return;
    }
    if (this.tool === 'room' && this.isActive()) {
      this.roomPaint.updateDrag(tx, ty);
      return;
    }
    if (this.tool === 'erase') {
      if (!this.isActive() || !pointer.isDown || !this.eraseDragLastTile) return;
      if (isOutOfBounds(tx, ty)) return;
      if (this.eraseDragLastTile.x === tx && this.eraseDragLastTile.y === ty) return;
      this.eraseDragLastTile = { x: tx, y: ty };
      this.scene.events.emit('cell-erase', { x: tx, y: ty } satisfies CellErasePayload);
    }
  }

  onPointerUp(pointer: Phaser.Input.Pointer) {
    const [tx, ty] = pointerToTile(pointer);
    if (this.tool === 'decor') return;
    if (this.tool === 'tile') {
      const result = this.tilePaint.endDrag(tx, ty);
      if (result) this.scene.events.emit('tiles-rect', result);
      return;
    }
    if (this.tool === 'collision') {
      const result = this.collisionPaint.endDrag(tx, ty);
      if (result) this.scene.events.emit('collision-rect', result satisfies CollisionRectPayload);
      return;
    }
    if (this.tool === 'wall') {
      const result = this.wallPaint.endDrag(tx, ty);
      if (result) {
        this.scene.events.emit('wall-rect', {
          x1: result.x1,
          y1: result.y1,
          x2: result.x2,
          y2: result.y2,
          region: this.selectedWallRegion,
          mode: result.mode,
        } satisfies WallRectPayload);
      }
      return;
    }
    if (this.tool === 'room') {
      const result = this.roomPaint.endDrag(tx, ty);
      if (result && result.mode === 'add') {
        this.scene.events.emit('room-rect', {
          x1: result.x1,
          y1: result.y1,
          x2: result.x2,
          y2: result.y2,
        } satisfies RoomRectPayload);
      }
      return;
    }
    if (this.tool === 'erase') {
      this.eraseDragLastTile = null;
    }
  }

  private placeOrRemoveDecor(model: MapModel, tx: number, ty: number) {
    const existing = model.decorAt(tx, ty);
    if (existing) {
      this.scene.events.emit('decor-remove', {
        x: existing.x,
        y: existing.y,
      } satisfies DecorRemovePayload);
      return;
    }
    const selected = this.selectedDecor ? getDecorAsset(this.selectedDecor) : undefined;
    if (!selected) return;
    for (const cell of selected.cells) {
      const cx = tx + cell.dx;
      const cy = ty + cell.dy;
      if (isOutOfBounds(cx, cy)) return;
      if (model.decorAt(cx, cy)) return;
    }
    this.scene.events.emit('decor-place', {
      asset: this.selectedDecor!,
      x: tx,
      y: ty,
    } satisfies DecorPlacePayload);
  }

  private isActive(): boolean {
    return this.buildOverlay.isActive();
  }

  private isFloorPresentAt(model: MapModel, tx: number, ty: number): boolean {
    const floor = model.floorAt(tx, ty);
    return !!floor && floor.asset === this.selectedFloor;
  }
}

function pointerToTile(pointer: Phaser.Input.Pointer): [number, number] {
  return [Math.floor(pointer.worldX / TILE_SIZE), Math.floor(pointer.worldY / TILE_SIZE)];
}

function isOutOfBounds(tx: number, ty: number): boolean {
  return tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS;
}
