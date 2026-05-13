import Phaser from 'phaser';
import type { MapData, PlayerMovedPayload } from '@nookapp/protocol';
import {
  CG_LAYER_ORDER,
  CG_VARIANTS,
  DEFAULT_APPEARANCE,
  variantUrl,
  type Appearance,
  type CgLayer,
} from '~/composables/useCharacter';
import { drawGrassBackground } from './scene/background';
import { BuildOverlay } from './scene/build-overlay';
import {
  DISPLAY_SCALE,
  SPAWN_TILE_X,
  SPAWN_TILE_Y,
  TILE_SIZE,
  WORLD_COLS,
  WORLD_H,
  WORLD_ROWS,
  WORLD_W,
} from './scene/constants';
import { FloorRenderer } from './scene/floor-renderer';
import { MapModel } from './scene/map-model';
import { RectPaintTool } from './scene/rect-paint-tool';
import { WallRenderer } from './scene/wall-renderer';

export type BuildTool = 'tile' | 'wall';

const PLAYER_SPEED = 170;
const EMIT_INTERVAL_MS = 1000 / 15; // 15 Hz

const ROOM_W = TILE_SIZE * 9; // 288px room width
const ROOM_H = TILE_SIZE * 8; // 256px room height

const IDLE_FRAME: Record<string, number> = { right: 0, up: 1, left: 2, down: 3 };
const WALK_START: Record<string, number> = { right: 112, up: 118, left: 124, down: 130 };

const CG_LAYERS = CG_LAYER_ORDER;

// Predefined positions for up to 6 voice rooms, distributed around the world
const ROOM_POSITIONS = [
  { x: 192, y: 192 },
  { x: 832, y: 192 },
  { x: 192, y: 832 },
  { x: 832, y: 832 },
  { x: 512, y: 192 },
  { x: 512, y: 832 },
];

export interface NameTagUpdate {
  userId: string;
  name: string;
  worldX: number;
  worldY: number;
}

export interface WorldObjectSpec {
  id: string;
  x: number;
  y: number;
  texture?: string;
  frame?: number | string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ObjectLabelUpdate {
  id: string;
  label: string;
  worldX: number;
  worldY: number;
}

export interface RoomZone {
  channelId: string;
  name: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

interface ActiveRoom extends RoomZone {
  bounds: Phaser.Geom.Rectangle;
  doorLabelWorldX: number;
  doorLabelWorldY: number;
}

interface RemotePlayer {
  layers: (Phaser.GameObjects.Sprite | null)[];
  lastDir: string;
  name: string;
  targetX: number;
  targetY: number;
  appearance: Appearance;
}

export class NookScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private interactKeyWasDown = false;
  localBody!: Phaser.Physics.Arcade.Sprite;
  private localLayers!: (Phaser.GameObjects.Sprite | null)[];
  private lastDir = 'down';
  private lastEmitTime = 0;
  private appearance: Appearance = { ...DEFAULT_APPEARANCE };
  private builtBodyAnims = new Set<string>();

  private remotePlayers = new Map<string, RemotePlayer>();
  private worldObjects = new Map<string, Phaser.GameObjects.GameObject>();
  private worldObjectSpecs = new Map<string, WorldObjectSpec>();

  private activeRooms: ActiveRoom[] = [];
  private currentRoomChannelId: string | null = null;
  private roomGraphics!: Phaser.GameObjects.Graphics;

  // Map editing
  private model: MapModel | null = null;
  private floorRenderer?: FloorRenderer;
  private wallRenderer?: WallRenderer;
  private buildOverlay?: BuildOverlay;
  private tilePaintTool?: RectPaintTool;
  private wallPaintTool?: RectPaintTool;
  private wallCollider?: Phaser.Physics.Arcade.Collider;
  private buildTool: BuildTool = 'tile';
  localUserId: string;
  readonly localUserName: string;
  onReady?: () => void;

  constructor(localUserId: string, localUserName: string, initialAppearance?: Appearance) {
    super({ key: 'NookScene' });
    this.localUserId = localUserId;
    this.localUserName = localUserName;
    if (initialAppearance) this.appearance = { ...initialAppearance };
  }

  setLocalUserId(userId: string) {
    if (this.localUserId === userId) return;
    this.localUserId = userId;
    this.removeRemotePlayer(userId);
  }

  preload() {
    for (const layer of CG_LAYERS) {
      for (const variant of CG_VARIANTS[layer]) {
        this.load.spritesheet(variant, variantUrl(layer, variant), {
          frameWidth: 16,
          frameHeight: 32,
        });
      }
    }
    this.load.image('wall_base', '/assets/wall_cream.png');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBackgroundColor('#cdd0d4');

    drawGrassBackground(this);

    this.floorRenderer = new FloorRenderer(this);
    this.wallRenderer = new WallRenderer(this);
    this.buildOverlay = new BuildOverlay(this);
    this.tilePaintTool = new RectPaintTool(this, { add: 0x6366f1, remove: 0xef4444 });
    this.wallPaintTool = new RectPaintTool(this, { add: 0x9a9a9a, remove: 0xef4444 });

    // Room graphics layer drawn below players
    this.roomGraphics = this.add.graphics();
    this.roomGraphics.setDepth(0.5);

    this.input.on('pointerdown', this.onBuildPointerDown, this);
    this.input.on('pointermove', this.onBuildPointerMove, this);
    this.input.on('pointerup', this.onBuildPointerUp, this);

    this.spawnLocalPlayer();
    this.wallCollider = this.wallRenderer.collideWith(this.localBody);
    this.setupInput();
    this.buildAnims();

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);

    this.onReady?.();
  }

  // --- Public API ---

  applyMapData(data: MapData) {
    this.model = new MapModel(data);
    this.floorRenderer?.apply(this.model);
    this.wallRenderer?.apply(this.model);
  }

  applyAppearance(next: Appearance) {
    this.appearance = { ...next };
    if (!this.localBody) return;
    this.ensureBodyAnims(next.body);
    this.swapLayers(this.localLayers, next, this.localBody.x, this.localBody.y);
    if (this.localBody.anims.isPlaying) {
      this.localBody.play(this.walkAnimKey(this.lastDir), true);
    } else {
      this.localBody.setFrame(IDLE_FRAME[this.lastDir]);
    }
  }

  setRemoteAppearance(userId: string, appearance: Appearance) {
    const remote = this.remotePlayers.get(userId);
    if (!remote) return;
    remote.appearance = { ...appearance };
    this.ensureBodyAnims(appearance.body);
    const body = remote.layers[0]!;
    this.swapLayers(remote.layers, appearance, body.x, body.y);
    if (body.anims.isPlaying) {
      body.play(this.walkAnimKey(remote.lastDir, appearance.body), true);
    } else {
      body.setFrame(IDLE_FRAME[remote.lastDir]);
    }
  }

  private swapLayers(
    layers: (Phaser.GameObjects.Sprite | null)[],
    appearance: Appearance,
    x: number,
    y: number,
  ) {
    for (let i = 0; i < CG_LAYERS.length; i++) {
      const layer = CG_LAYERS[i] as CgLayer;
      const variant = appearance[layer];
      const existing = layers[i];
      if (variant) {
        if (existing) {
          existing.setTexture(variant);
        } else {
          const spr = this.add.sprite(x, y, variant);
          spr
            .setScale(2)
            .setOrigin(0.5, 0.85)
            .setDepth(y + 0.01 * i);
          layers[i] = spr;
          if (i === 0) {
            this.physics.add.existing(spr);
            const pb = spr.body as Phaser.Physics.Arcade.Body;
            pb.setSize(10, 6).setOffset(3, 24);
            pb.setCollideWorldBounds(true);
          }
        }
      } else if (existing) {
        existing.destroy();
        layers[i] = null;
      }
    }
  }

  setBuildMode(active: boolean) {
    if (!this.buildOverlay || this.buildOverlay.isActive() === active) return;
    this.buildOverlay.setActive(active);
    if (this.wallCollider) this.wallCollider.active = !active;
    if (!active) {
      this.tilePaintTool?.cancel();
      this.wallPaintTool?.cancel();
    }
  }

  setBuildTool(tool: BuildTool) {
    if (this.buildTool === tool) return;
    this.buildTool = tool;
    this.tilePaintTool?.cancel();
    this.wallPaintTool?.cancel();
  }

  private activeTool(): RectPaintTool | undefined {
    return this.buildTool === 'tile' ? this.tilePaintTool : this.wallPaintTool;
  }

  private isPresentAtPointer(tx: number, ty: number): boolean {
    if (!this.model) return false;
    return this.buildTool === 'tile' ? this.model.hasFloor(tx, ty) : this.model.hasWall(tx, ty);
  }

  private commitEventName(): 'tiles-rect' | 'walls-rect' {
    return this.buildTool === 'tile' ? 'tiles-rect' : 'walls-rect';
  }

  private isBuildActive() {
    return this.buildOverlay?.isActive() ?? false;
  }

  private pointerToTile(pointer: Phaser.Input.Pointer): [number, number] {
    return [Math.floor(pointer.worldX / TILE_SIZE), Math.floor(pointer.worldY / TILE_SIZE)];
  }

  private onBuildPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.isBuildActive() || !this.model) return;
    const [tx, ty] = this.pointerToTile(pointer);
    if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) return;
    this.activeTool()?.beginDrag(tx, ty, this.isPresentAtPointer(tx, ty));
  }

  private onBuildPointerMove(pointer: Phaser.Input.Pointer) {
    const [tx, ty] = this.pointerToTile(pointer);
    this.activeTool()?.updateDrag(tx, ty);
  }

  private onBuildPointerUp(pointer: Phaser.Input.Pointer) {
    const tool = this.activeTool();
    if (!tool) return;
    const [tx, ty] = this.pointerToTile(pointer);
    const result = tool.endDrag(tx, ty);
    if (result) this.events.emit(this.commitEventName(), result);
  }

  setRooms(zones: RoomZone[]) {
    this.activeRooms = zones.slice(0, ROOM_POSITIONS.length).map((zone, i) => {
      const hasCustomZone = zone.x !== 0 || zone.y !== 0;
      const pos = hasCustomZone ? { x: zone.x, y: zone.y } : ROOM_POSITIONS[i]!;
      const w = zone.w ?? ROOM_W;
      const h = zone.h ?? ROOM_H;
      return {
        ...zone,
        x: pos.x,
        y: pos.y,
        bounds: new Phaser.Geom.Rectangle(pos.x, pos.y, w, h),
        doorLabelWorldX: pos.x + w / 2,
        doorLabelWorldY: pos.y + h + 8,
      };
    });
    this.redrawRooms();
  }

  updateRemotePlayer(payload: PlayerMovedPayload, name: string | null) {
    if (payload.userId === this.localUserId) return;

    let remote = this.remotePlayers.get(payload.userId);
    if (!remote) {
      remote = this.spawnRemotePlayer(payload.x, payload.y, name ?? payload.userId);
      const body = remote.layers[0]!;
      body.setInteractive();
      body.on('pointerdown', () => {
        this.events.emit('player:interact', {
          userId: payload.userId,
          name: remote!.name,
          worldX: body.x,
          worldY: body.y,
        });
      });
      this.remotePlayers.set(payload.userId, remote);
    }
    if (name) remote.name = name;

    remote.targetX = payload.x;
    remote.targetY = payload.y;

    const target = remote.layers[0]!;

    if (payload.moving) {
      if (payload.dir !== remote.lastDir || !target.anims.isPlaying) {
        target.play(this.walkAnimKey(payload.dir, remote.appearance.body), true);
        remote.lastDir = payload.dir;
      }
    } else {
      if (target.anims.isPlaying) {
        target.anims.stop();
        target.setFrame(IDLE_FRAME[payload.dir]);
      }
    }
  }

  emitCurrentPosition() {
    const pb = this.localBody?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!pb) return;
    this.events.emit('player-moved', {
      userId: this.localUserId,
      x: this.localBody.x,
      y: this.localBody.y,
      dir: this.lastDir as PlayerMovedPayload['dir'],
      moving: false,
    } satisfies PlayerMovedPayload);
  }

  /** Teleport the local player to world-pixel coordinates and broadcast it. */
  teleport(x: number, y: number) {
    if (!this.localBody) return;
    const pb = this.localBody.body as Phaser.Physics.Arcade.Body | undefined;
    pb?.setVelocity(0, 0);
    this.localBody.setPosition(x, y);
    this.localBody.anims.stop();
    this.localBody.setFrame(IDLE_FRAME[this.lastDir]);
    this.cameras.main.centerOn(x, y);
    this.emitCurrentPosition();
  }

  removeRemotePlayer(userId: string) {
    const remote = this.remotePlayers.get(userId);
    if (!remote) return;
    for (const spr of remote.layers) spr?.destroy();
    this.remotePlayers.delete(userId);
  }

  hasRemotePlayer(userId: string): boolean {
    return this.remotePlayers.has(userId);
  }

  private tryInteractNearest() {
    const px = this.localBody.x;
    const py = this.localBody.y;
    let nearest: { userId: string; name: string; worldX: number; worldY: number } | null = null;
    let minDist = 80;
    for (const [userId, remote] of this.remotePlayers) {
      const spr = remote.layers[0]!;
      const dx = spr.x - px;
      const dy = spr.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = { userId, name: remote.name, worldX: spr.x, worldY: spr.y };
      }
    }
    if (nearest) this.events.emit('player:interact', nearest);
  }

  spawnWorldObject(spec: WorldObjectSpec) {
    this.removeWorldObject(spec.id);

    let obj: Phaser.GameObjects.GameObject;
    if (spec.texture && this.textures.exists(spec.texture)) {
      const spr = this.add.sprite(spec.x, spec.y, spec.texture, spec.frame);
      spr.setScale(2).setOrigin(0.5, 1).setDepth(spec.y);
      obj = spr;
    } else {
      const rect = this.add.rectangle(spec.x, spec.y, 32, 32, 0x6c63ff, 0.9);
      rect.setOrigin(0.5, 1).setDepth(spec.y);
      this.tweens.add({
        targets: rect,
        y: spec.y - 4,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      obj = rect;
    }

    const go = obj as Phaser.GameObjects.GameObject &
      Phaser.GameObjects.Components.Transform &
      Phaser.GameObjects.Components.Size;
    go.setInteractive({ useHandCursor: true });
    go.on('pointerdown', () => {
      this.events.emit('world-object-clicked', spec.id);
    });

    this.worldObjects.set(spec.id, obj);
    this.worldObjectSpecs.set(spec.id, spec);
  }

  removeWorldObject(id: string) {
    this.worldObjects.get(id)?.destroy();
    this.worldObjects.delete(id);
    this.worldObjectSpecs.delete(id);
  }

  // --- Private ---

  private redrawRooms() {
    const g = this.roomGraphics;
    g.clear();

    for (const room of this.activeRooms) {
      const { x, y } = room;
      const rw = room.bounds.width;
      const rh = room.bounds.height;
      // Subtle dashed outline only — no walls, no floor tint
      g.lineStyle(1, 0xc8bfff, 0.7);
      this.strokeDashedRect(g, x, y, rw, rh, 5, 4);
    }
  }

  private strokeDashedRect(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    dash: number,
    gap: number,
  ) {
    this.strokeDashedLine(g, x, y, x + w, y, dash, gap);
    this.strokeDashedLine(g, x + w, y, x + w, y + h, dash, gap);
    this.strokeDashedLine(g, x + w, y + h, x, y + h, dash, gap);
    this.strokeDashedLine(g, x, y + h, x, y, dash, gap);
  }

  private strokeDashedLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dash: number,
    gap: number,
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;
    let pos = 0;
    let drawing = true;
    while (pos < len) {
      const seg = Math.min(drawing ? dash : gap, len - pos);
      if (drawing) {
        g.beginPath();
        g.moveTo(x1 + nx * pos, y1 + ny * pos);
        g.lineTo(x1 + nx * (pos + seg), y1 + ny * (pos + seg));
        g.strokePath();
      }
      pos += seg;
      drawing = !drawing;
    }
  }

  private spawnLocalPlayer() {
    this.localLayers = this.spawnLayers(
      SPAWN_TILE_X * TILE_SIZE + TILE_SIZE / 2,
      SPAWN_TILE_Y * TILE_SIZE + TILE_SIZE / 2,
      this.appearance,
    );
    const body = this.localLayers[0] as Phaser.GameObjects.Sprite;
    this.physics.add.existing(body);
    this.localBody = body as Phaser.Physics.Arcade.Sprite;
    const pb = this.localBody.body as Phaser.Physics.Arcade.Body;
    pb.setSize(10, 6).setOffset(3, 24);
    pb.setCollideWorldBounds(true);
  }

  private spawnRemotePlayer(x: number, y: number, name: string): RemotePlayer {
    const appearance: Appearance = { ...DEFAULT_APPEARANCE };
    const layers = this.spawnLayers(x, y, appearance);
    this.ensureBodyAnims(appearance.body);
    return { layers, lastDir: 'down', name, targetX: x, targetY: y, appearance };
  }

  private spawnLayers(
    x: number,
    y: number,
    appearance: Appearance,
  ): (Phaser.GameObjects.Sprite | null)[] {
    return CG_LAYERS.map((layer, i) => {
      const variant = appearance[layer];
      if (!variant) return null;
      const spr = this.add.sprite(x, y, variant);
      spr
        .setScale(2)
        .setOrigin(0.5, 0.85)
        .setDepth(y + 0.01 * i);
      return spr;
    });
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    kb.disableGlobalCapture();
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z, false),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q, false),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
    kb.clearCaptures();
  }

  private buildAnims() {
    this.ensureBodyAnims(this.appearance.body);
  }

  private ensureBodyAnims(bodyKey: string) {
    if (this.builtBodyAnims.has(bodyKey)) return;
    for (const [dir, start] of Object.entries(WALK_START)) {
      const key = `walk-${dir}-${bodyKey}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: Array.from({ length: 6 }, (_, i) => ({ key: bodyKey, frame: start + i })),
        frameRate: 8,
        repeat: -1,
      });
    }
    this.builtBodyAnims.add(bodyKey);
  }

  private walkAnimKey(dir: string, bodyKey?: string): string {
    return `walk-${dir}-${bodyKey ?? this.appearance.body}`;
  }

  private keyboardVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) y += 1;

    return { x, y };
  }

  private applyLocalVelocity(vx: number, vy: number) {
    const moving = vx !== 0 || vy !== 0;

    if (moving) {
      const dir =
        Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      if (dir !== this.lastDir || !this.localBody.anims.isPlaying) {
        this.localBody.play(this.walkAnimKey(dir), true);
        this.lastDir = dir;
      }
    } else if (this.localBody.anims.isPlaying) {
      this.localBody.anims.stop();
      this.localBody.setFrame(IDLE_FRAME[this.lastDir]);
    }

    (this.localBody.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
  }

  override update(_time: number, _delta: number) {
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      this.applyLocalVelocity(0, 0);
      return;
    }

    const keyboard = this.keyboardVector();
    let vx = keyboard.x;
    let vy = keyboard.y;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }

    this.applyLocalVelocity(vx, vy);

    // E key: open profile popup for the nearest remote player (fire once per press)
    const eNow = this.interactKey.isDown;
    if (eNow && !this.interactKeyWasDown && !this.isBuildActive()) {
      this.tryInteractNearest();
    }
    this.interactKeyWasDown = eNow;

    // Manual camera lerp with integer snap. Camera zoom is 1 (the 1.5× display
    // scale is done by CSS on the canvas), so any integer world position maps
    // to an integer canvas pixel — no sub-pixel sampling at sprite boundaries.
    {
      const cam = this.cameras.main;
      const tx = this.localBody.x - cam.width / 2;
      const ty = this.localBody.y - cam.height / 2;
      const lx = cam.scrollX + (tx - cam.scrollX) * 0.15;
      const ly = cam.scrollY + (ty - cam.scrollY) * 0.15;
      cam.scrollX = Math.round(lx);
      cam.scrollY = Math.round(ly);
    }

    // Lerp remote players toward their last-known target position each frame
    for (const remote of this.remotePlayers.values()) {
      const spr = remote.layers[0]!;
      const lerpX = Phaser.Math.Linear(spr.x, remote.targetX, 0.3);
      const lerpY = Phaser.Math.Linear(spr.y, remote.targetY, 0.3);
      const snappedX = Math.round(lerpX);
      const snappedY = Math.round(lerpY);
      spr.setPosition(snappedX, snappedY);
      const frame = spr.frame.name;
      for (let i = 1; i < remote.layers.length; i++) {
        const layer = remote.layers[i];
        if (!layer) continue;
        layer.setFrame(frame).setPosition(snappedX, snappedY);
        layer.setDepth(snappedY + 0.01 * i);
      }
      spr.setDepth(snappedY);
    }
  }

  private onPostUpdate() {
    const now = this.time.now;
    const frame = this.localBody.frame.name;

    // Snap visual position to integer world units. With camera zoom 1, every
    // integer world pixel lands on an integer canvas pixel — the CSS scale is
    // applied uniformly to the whole canvas afterward, no per-sprite seams.
    const snappedX = Math.round(this.localBody.x);
    const snappedY = Math.round(this.localBody.y);
    this.localBody.setPosition(snappedX, snappedY);

    for (let i = 1; i < this.localLayers.length; i++) {
      const layer = this.localLayers[i];
      if (!layer) continue;
      layer.setFrame(frame).setPosition(snappedX, snappedY);
      layer.setDepth(snappedY + 0.01 * i);
    }
    this.localBody.setDepth(snappedY);

    // 15 Hz position broadcast
    if (now - this.lastEmitTime >= EMIT_INTERVAL_MS) {
      this.lastEmitTime = now;
      const pb = this.localBody.body as Phaser.Physics.Arcade.Body;
      const moving = pb.velocity.x !== 0 || pb.velocity.y !== 0;
      this.events.emit('player-moved', {
        userId: this.localUserId,
        x: this.localBody.x,
        y: this.localBody.y,
        dir: this.lastDir as PlayerMovedPayload['dir'],
        moving,
      } satisfies PlayerMovedPayload);
    }

    // Room proximity detection — check which room (if any) the local player is inside
    if (this.activeRooms.length) {
      const px = this.localBody.x;
      const py = this.localBody.y;
      let insideRoom: ActiveRoom | null = null;
      for (const room of this.activeRooms) {
        if (Phaser.Geom.Rectangle.Contains(room.bounds, px, py)) {
          insideRoom = room;
          break;
        }
      }
      const newChannelId = insideRoom?.channelId ?? null;
      if (newChannelId !== this.currentRoomChannelId) {
        const prev = this.currentRoomChannelId;
        this.currentRoomChannelId = newChannelId;
        // Redraw rooms so the active one gets the highlighted floor
        this.redrawRooms();
        if (prev) this.events.emit('room:left', { channelId: prev });
        if (newChannelId) this.events.emit('room:entered', { channelId: newChannelId });
      }
    }

    // DOM name tags
    const tags: NameTagUpdate[] = [
      {
        userId: this.localUserId,
        name: this.localUserName,
        worldX: this.localBody.x,
        worldY: this.localBody.y,
      },
    ];
    for (const [userId, remote] of this.remotePlayers) {
      const spr = remote.layers[0]!;
      tags.push({ userId, name: remote.name, worldX: spr.x, worldY: spr.y });
    }
    this.events.emit('name-tags', tags);

    // DOM object labels
    const objectLabels: ObjectLabelUpdate[] = [];
    for (const [id, spec] of this.worldObjectSpecs) {
      if (!spec.label) continue;
      const obj = this.worldObjects.get(id) as
        | (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform)
        | undefined;
      if (!obj) continue;
      objectLabels.push({ id, label: spec.label, worldX: obj.x, worldY: obj.y - 20 });
    }
    // Room door labels
    for (const room of this.activeRooms) {
      objectLabels.push({
        id: `room:${room.channelId}`,
        label: `🔊 ${room.name}`,
        worldX: room.doorLabelWorldX,
        worldY: room.doorLabelWorldY,
      });
    }
    if (objectLabels.length) this.events.emit('object-labels', objectLabels);
  }

  static projectToScreen(
    cam: Phaser.Cameras.Scene2D.Camera,
    _rect: DOMRect,
    worldX: number,
    worldY: number,
  ): { x: number; y: number } {
    // scrollX/Y are the world coords of the camera's top-left edge.
    // (worldX - scrollX) * zoom = canvas-internal pixel offset; the canvas is
    // CSS-scaled by DISPLAY_SCALE for display, so we multiply once more.
    return {
      x: (worldX - cam.scrollX) * cam.zoom * DISPLAY_SCALE,
      y: (worldY - cam.scrollY) * cam.zoom * DISPLAY_SCALE,
    };
  }
}
