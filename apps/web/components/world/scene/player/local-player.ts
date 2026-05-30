import Phaser from 'phaser';
import type { PlayerMovedPayload } from '@nookapp/protocol';
import type { Appearance } from '~/composables/useCharacter';
import { directionFromVelocity, idleFrame, type Direction } from '~/utils/cg-sheet';
import { SPAWN_TILE_X, SPAWN_TILE_Y, TILE_SIZE, WORLD_COLS, WORLD_ROWS } from '../constants';
import { CharacterSprite } from '../character/character-sprite';
import type { MapModel } from '../map-model';
import type { NameTagUpdate } from '../types';
import { WorldKeyboard } from './keyboard';

const PLAYER_SPEED = 170;
const EMIT_INTERVAL_MS = 1000 / 15; // 15 Hz
const CAMERA_LERP = 0.15;
const INTERACT_RADIUS = 80;

interface LocalPlayerDeps {
  getUserId: () => string;
  userName: string;
}

// The player you control with the keyboard.
export class LocalPlayer {
  readonly sprite: CharacterSprite;
  private readonly keyboard: WorldKeyboard;
  private lastDir: Direction = 'down';
  private cameraOffset = { x: 0, y: 0 };
  private sitting = false;
  private lastEmitTime = 0;
  private lastEmitState = { x: 0, y: 0, dir: '', moving: false, sitting: false };

  constructor(
    private readonly scene: Phaser.Scene,
    appearance: Appearance,
    private readonly deps: LocalPlayerDeps,
  ) {
    this.sprite = new CharacterSprite(
      scene,
      SPAWN_TILE_X * TILE_SIZE + TILE_SIZE / 2,
      SPAWN_TILE_Y * TILE_SIZE + TILE_SIZE / 2,
      appearance,
      { physics: true },
    );
    this.keyboard = new WorldKeyboard(scene);
  }

  get body(): Phaser.Physics.Arcade.Sprite {
    return this.sprite.physicsBody;
  }

  get radius(): number {
    return INTERACT_RADIUS;
  }

  isTyping(): boolean {
    return this.keyboard.isTypingInField();
  }

  interactPressed(): boolean {
    return this.keyboard.interactPressedEdge();
  }

  isSitting(): boolean {
    return this.sitting;
  }

  // true when the player is asking to move (used to stand up off a chair)
  movementRequested(): boolean {
    const { x, y } = this.keyboard.vector();
    return x !== 0 || y !== 0;
  }

  setAppearance(next: Appearance) {
    this.sprite.setAppearance(next);
    this.sprite.reapplyAnim(this.lastDir);
  }

  setCameraOffset(x: number, y: number) {
    this.cameraOffset = { x, y };
    this.centerCamera();
  }

  // jump the camera onto the player, no smoothing
  centerCamera() {
    const cam = this.scene.cameras.main;
    cam.scrollX = Math.round(this.body.x - cam.width / 2 - this.cameraOffset.x);
    cam.scrollY = Math.round(this.body.y - cam.height / 2 - this.cameraOffset.y);
  }

  update() {
    if (this.sitting) {
      this.halt();
      this.lerpCamera();
      return;
    }
    const { x, y } = this.keyboard.vector();
    let vx = x;
    let vy = y;
    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }
    this.applyVelocity(vx, vy);
    this.lerpCamera();
  }

  // stop moving without reading the keyboard (used while typing in a field)
  halt() {
    this.applyVelocity(0, 0);
  }

  private applyVelocity(vx: number, vy: number) {
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const dir = directionFromVelocity(vx, vy);
      if (dir !== this.lastDir || !this.sprite.isPlaying) {
        this.sprite.playWalk(dir);
        this.lastDir = dir;
      }
    } else if (this.sprite.isPlaying) {
      this.sprite.idle(this.lastDir);
    }
    (this.body.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
  }

  private lerpCamera() {
    const cam = this.scene.cameras.main;
    const tx = this.body.x - cam.width / 2 - this.cameraOffset.x;
    const ty = this.body.y - cam.height / 2 - this.cameraOffset.y;
    cam.scrollX = Math.round(cam.scrollX + (tx - cam.scrollX) * CAMERA_LERP);
    cam.scrollY = Math.round(cam.scrollY + (ty - cam.scrollY) * CAMERA_LERP);
  }

  snapAndSync() {
    this.sprite.sync();
  }

  maybeEmit(now: number) {
    if (now - this.lastEmitTime < EMIT_INTERVAL_MS) return;
    const pb = this.body.body as Phaser.Physics.Arcade.Body;
    const moving = pb.velocity.x !== 0 || pb.velocity.y !== 0;
    const x = this.body.x;
    const y = this.body.y;
    const dir = this.lastDir;
    const last = this.lastEmitState;
    if (
      last.x === x &&
      last.y === y &&
      last.dir === dir &&
      last.moving === moving &&
      last.sitting === this.sitting
    ) {
      return;
    }
    this.lastEmitTime = now;
    this.emit(x, y, dir, moving);
  }

  emitCurrentPosition() {
    this.emit(this.body.x, this.body.y, this.lastDir, false);
  }

  // snap onto a seat and hold a seated pose (movement stays locked until stand)
  sit(seatX: number, seatY: number, dir: Direction) {
    this.sitting = true;
    this.lastDir = dir;
    (this.body.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.body.setPosition(seatX, seatY);
    this.sprite.sit(dir);
    this.emit(seatX, seatY, dir, false);
  }

  // leave the seat, returning to where the player came from
  stand(returnX: number, returnY: number) {
    this.sitting = false;
    (this.body.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.body.setPosition(returnX, returnY);
    this.sprite.idle(this.lastDir);
    this.scene.cameras.main.centerOn(returnX, returnY);
    this.emit(returnX, returnY, this.lastDir, false);
  }

  private emit(x: number, y: number, dir: Direction, moving: boolean) {
    const last = this.lastEmitState;
    last.x = x;
    last.y = y;
    last.dir = dir;
    last.moving = moving;
    last.sitting = this.sitting;
    this.scene.events.emit('player-moved', {
      userId: this.deps.getUserId(),
      x,
      y,
      dir: dir as PlayerMovedPayload['dir'],
      moving,
      pose: this.sitting ? 'sit' : undefined,
    } satisfies PlayerMovedPayload);
  }

  teleport(x: number, y: number) {
    (this.body.body as Phaser.Physics.Arcade.Body | undefined)?.setVelocity(0, 0);
    this.body.setPosition(x, y);
    this.body.anims.stop();
    this.body.setFrame(idleFrame(this.lastDir));
    this.scene.cameras.main.centerOn(x, y);
    this.emitCurrentPosition();
  }

  // if we ended up inside a wall/decor, move to the closest free tile
  unstickFrom(model: MapModel) {
    const [ox, oy] = worldToTile(this.body.x, this.body.y);
    if (!isBlockedTile(model, ox, oy)) return;
    for (let radius = 1; radius <= 8; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const tx = ox + dx;
          const ty = oy + dy;
          if (isBlockedTile(model, tx, ty)) continue;
          this.teleport(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
          return;
        }
      }
    }
  }

  nameTag(): NameTagUpdate {
    return {
      userId: this.deps.getUserId(),
      name: this.deps.userName,
      worldX: this.body.x,
      worldY: this.body.y,
    };
  }
}

function worldToTile(x: number, y: number): [number, number] {
  return [Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)];
}

function isBlockedTile(model: MapModel, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) return true;
  return model.hasWall(tx, ty) || !!model.decorAt(tx, ty);
}
