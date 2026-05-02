import Phaser from 'phaser';
import type { PlayerMovedPayload } from '@nookapp/protocol';

const TILE_SIZE = 32;
const WORLD_COLS = 40;
const WORLD_ROWS = 40;
const WORLD_W = WORLD_COLS * TILE_SIZE;
const WORLD_H = WORLD_ROWS * TILE_SIZE;
const PLAYER_SPEED = 170;
const EMIT_INTERVAL_MS = 1000 / 15; // 15 Hz

const WALL_T = TILE_SIZE * 2; // 64px wall thickness
const DOOR_W = TILE_SIZE * 3; // 96px door opening
const ROOM_W = TILE_SIZE * 9; // 288px room width
const ROOM_H = TILE_SIZE * 8; // 256px room height

const IDLE_FRAME: Record<string, number> = { right: 0, up: 1, left: 2, down: 3 };
const WALK_START: Record<string, number> = { right: 112, up: 118, left: 124, down: 130 };

const CG_LAYERS = ['body', 'eyes', 'outfit', 'hair', 'accessory'] as const;
type CgLayer = (typeof CG_LAYERS)[number];

const DEFAULT_SKIN: Record<CgLayer, string> = {
  body: '/assets/cg/body/body_01.png',
  eyes: '/assets/cg/eyes/eyes_01.png',
  outfit: '/assets/cg/outfit/outfit_01.png',
  hair: '/assets/cg/hair/hair_01.png',
  accessory: '/assets/cg/accessory/acc_backpack.png',
};

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
}

interface ActiveRoom extends RoomZone {
  bounds: Phaser.Geom.Rectangle;
  doorLabelWorldX: number;
  doorLabelWorldY: number;
}

interface RemotePlayer {
  layers: Phaser.GameObjects.Sprite[];
  lastDir: string;
  name: string;
  targetX: number;
  targetY: number;
}

export class NookScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  localBody!: Phaser.Physics.Arcade.Sprite;
  private localLayers!: Phaser.GameObjects.Sprite[];
  private lastDir = 'down';
  private lastEmitTime = 0;

  private remotePlayers = new Map<string, RemotePlayer>();
  private worldObjects = new Map<string, Phaser.GameObjects.GameObject>();
  private worldObjectSpecs = new Map<string, WorldObjectSpec>();

  private activeRooms: ActiveRoom[] = [];
  private currentRoomChannelId: string | null = null;
  private roomGraphics!: Phaser.GameObjects.Graphics;

  localUserId: string;
  readonly localUserName: string;
  onReady?: () => void;

  constructor(localUserId: string, localUserName: string) {
    super({ key: 'NookScene' });
    this.localUserId = localUserId;
    this.localUserName = localUserName;
  }

  setLocalUserId(userId: string) {
    if (this.localUserId === userId) return;
    this.localUserId = userId;
    this.removeRemotePlayer(userId);
  }

  preload() {
    for (const layer of CG_LAYERS) {
      this.load.spritesheet(`cg_${layer}`, DEFAULT_SKIN[layer], {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#cdd0d4');

    this.drawFloor();

    // Room graphics layer drawn below players
    this.roomGraphics = this.add.graphics();
    this.roomGraphics.setDepth(0.5);

    this.spawnLocalPlayer();
    this.cameras.main.startFollow(this.localBody, true, 0.15, 0.15);
    this.setupInput();
    this.buildAnims();

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);

    this.onReady?.();
  }

  // --- Public API ---

  setRooms(zones: RoomZone[]) {
    this.activeRooms = zones.slice(0, ROOM_POSITIONS.length).map((zone, i) => {
      const pos = ROOM_POSITIONS[i]!;
      return {
        ...zone,
        x: pos.x,
        y: pos.y,
        bounds: new Phaser.Geom.Rectangle(pos.x, pos.y, ROOM_W, ROOM_H),
        // Label above the door opening (bottom-center of room)
        doorLabelWorldX: pos.x + ROOM_W / 2,
        doorLabelWorldY: pos.y + ROOM_H + 8,
      };
    });
    this.redrawRooms();
  }

  updateRemotePlayer(payload: PlayerMovedPayload, name: string | null) {
    if (payload.userId === this.localUserId) return;

    let remote = this.remotePlayers.get(payload.userId);
    if (!remote) {
      remote = this.spawnRemotePlayer(payload.x, payload.y, name ?? payload.userId);
      this.remotePlayers.set(payload.userId, remote);
    }
    if (name) remote.name = name;

    remote.targetX = payload.x;
    remote.targetY = payload.y;

    const target = remote.layers[0];

    if (payload.moving) {
      if (payload.dir !== remote.lastDir || !target.anims.isPlaying) {
        target.play(`walk-${payload.dir}`, true);
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

  removeRemotePlayer(userId: string) {
    const remote = this.remotePlayers.get(userId);
    if (!remote) return;
    for (const spr of remote.layers) spr.destroy();
    this.remotePlayers.delete(userId);
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
      const isActive = this.currentRoomChannelId === room.channelId;

      // Floor tint — warm beige slightly different from open area
      g.fillStyle(isActive ? 0xf0e0b0 : 0xe8d8a8, 1);
      g.fillRect(x + WALL_T, y + WALL_T, ROOM_W - WALL_T * 2, ROOM_H - WALL_T);

      // Walls
      const wallColor = 0x3a3028;
      g.fillStyle(wallColor, 1);
      // Top wall
      g.fillRect(x, y, ROOM_W, WALL_T);
      // Left wall
      g.fillRect(x, y, WALL_T, ROOM_H);
      // Right wall
      g.fillRect(x + ROOM_W - WALL_T, y, WALL_T, ROOM_H);
      // Bottom wall — two halves with door gap in the center
      const doorLeft = x + ROOM_W / 2 - DOOR_W / 2;
      g.fillRect(x, y + ROOM_H - WALL_T, doorLeft - x, WALL_T);
      g.fillRect(doorLeft + DOOR_W, y + ROOM_H - WALL_T, x + ROOM_W - (doorLeft + DOOR_W), WALL_T);

      // Door frame highlights
      g.fillStyle(isActive ? 0x6c8fa0 : 0x5a7080, 1);
      g.fillRect(doorLeft - 4, y + ROOM_H - WALL_T - 4, 4, WALL_T + 4);
      g.fillRect(doorLeft + DOOR_W, y + ROOM_H - WALL_T - 4, 4, WALL_T + 4);
    }
  }

  private drawFloor() {
    const tileKey = 'floor_tile';
    if (!this.textures.exists(tileKey)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xf3ead4, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.lineStyle(1, 0xe6dcc2, 0.6);
      g.lineBetween(0, TILE_SIZE - 0.5, TILE_SIZE, TILE_SIZE - 0.5);
      g.lineBetween(TILE_SIZE - 0.5, 0, TILE_SIZE - 0.5, TILE_SIZE);
      g.generateTexture(tileKey, TILE_SIZE, TILE_SIZE);
      g.destroy();
    }
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, tileKey).setOrigin(0, 0);

    const wall = this.add.graphics();
    wall.fillStyle(0x2d2d2d, 1);
    wall.fillRect(0, 0, WORLD_W, 16);
    wall.fillRect(0, WORLD_H - 16, WORLD_W, 16);
    wall.fillRect(0, 0, 16, WORLD_H);
    wall.fillRect(WORLD_W - 16, 0, 16, WORLD_H);
    wall.setDepth(15);
  }

  private spawnLocalPlayer() {
    this.localLayers = this.spawnLayers(WORLD_W / 2, WORLD_H / 2);
    this.physics.add.existing(this.localLayers[0]);
    this.localBody = this.localLayers[0] as Phaser.Physics.Arcade.Sprite;
    const pb = this.localBody.body as Phaser.Physics.Arcade.Body;
    pb.setSize(10, 6).setOffset(3, 24);
    pb.setCollideWorldBounds(true);
  }

  private spawnRemotePlayer(x: number, y: number, name: string): RemotePlayer {
    const layers = this.spawnLayers(x, y);
    return { layers, lastDir: 'down', name, targetX: x, targetY: y };
  }

  private spawnLayers(x: number, y: number): Phaser.GameObjects.Sprite[] {
    return CG_LAYERS.map((layer, i) => {
      const spr = this.add.sprite(x, y, `cg_${layer}`);
      spr
        .setScale(2)
        .setOrigin(0.5, 0.85)
        .setDepth(y + 0.01 * i);
      return spr;
    });
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    kb.enableGlobalCapture();
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private buildAnims() {
    for (const [dir, start] of Object.entries(WALK_START)) {
      this.anims.create({
        key: `walk-${dir}`,
        frames: Array.from({ length: 6 }, (_, i) => ({ key: 'cg_body', frame: start + i })),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  override update(_time: number, _delta: number) {
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    const moving = vx !== 0 || vy !== 0;

    if (moving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
      const dir =
        Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      if (dir !== this.lastDir || !this.localBody.anims.isPlaying) {
        this.localBody.play(`walk-${dir}`, true);
        this.lastDir = dir;
      }
    } else {
      if (this.localBody.anims.isPlaying) {
        this.localBody.anims.stop();
        this.localBody.setFrame(IDLE_FRAME[this.lastDir]);
      }
    }

    (this.localBody.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);

    // Lerp remote players toward their last-known target position each frame
    for (const remote of this.remotePlayers.values()) {
      const spr = remote.layers[0];
      spr.x = Phaser.Math.Linear(spr.x, remote.targetX, 0.3);
      spr.y = Phaser.Math.Linear(spr.y, remote.targetY, 0.3);
      const frame = spr.frame.name;
      for (let i = 1; i < remote.layers.length; i++) {
        remote.layers[i].setFrame(frame).setPosition(spr.x, spr.y);
        remote.layers[i].setDepth(spr.y + 0.01 * i);
      }
      spr.setDepth(spr.y);
    }
  }

  private onPostUpdate() {
    const now = this.time.now;
    const frame = this.localBody.frame.name;

    for (let i = 1; i < this.localLayers.length; i++) {
      this.localLayers[i].setFrame(frame).setPosition(this.localBody.x, this.localBody.y);
      this.localLayers[i].setDepth(this.localBody.y + 0.01 * i);
    }
    this.localBody.setDepth(this.localBody.y);

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
      const spr = remote.layers[0];
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
    rect: DOMRect,
    worldX: number,
    worldY: number,
  ): { x: number; y: number } {
    const wv = cam.worldView;
    return {
      x: ((worldX - wv.x) / wv.width) * rect.width,
      y: ((worldY - wv.y) / wv.height) * rect.height,
    };
  }
}
