import Phaser from 'phaser';

const TILE_SIZE = 32;
const WORLD_COLS = 40;
const WORLD_ROWS = 40;
const WORLD_W = WORLD_COLS * TILE_SIZE;
const WORLD_H = WORLD_ROWS * TILE_SIZE;
const PLAYER_SPEED = 170;
const FRAME_COLS = 56;

const IDLE_FRAME: Record<string, number> = {
  right: 0,
  up: 1,
  left: 2,
  down: 3,
};

const WALK_START: Record<string, number> = {
  right: 112,
  up: 118,
  left: 124,
  down: 130,
};

const CG_LAYERS = ['body', 'eyes', 'outfit', 'hair', 'accessory'] as const;
type CgLayer = (typeof CG_LAYERS)[number];

const DEFAULT_SKIN: Record<CgLayer, string> = {
  body: '/assets/cg/body/body_01.png',
  eyes: '/assets/cg/eyes/eyes_01.png',
  outfit: '/assets/cg/outfit/outfit_01.png',
  hair: '/assets/cg/hair/hair_01.png',
  accessory: '/assets/cg/accessory/acc_backpack.png',
};

export interface PlayerPosEvent {
  worldX: number;
  worldY: number;
}

export class NookScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private body!: Phaser.Physics.Arcade.Sprite;
  private layers!: Phaser.GameObjects.Sprite[];
  private lastDir = 'down';

  constructor() {
    super({ key: 'NookScene' });
  }

  preload() {
    const frameConfig = { frameWidth: TILE_SIZE / 2, frameHeight: TILE_SIZE };
    for (const layer of CG_LAYERS) {
      this.load.spritesheet(`cg_${layer}`, DEFAULT_SKIN[layer], {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
    // suppress: frameConfig used indirectly above
    void frameConfig;
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#cdd0d4');

    this.drawFloor();
    this.spawnPlayer();
    this.setupCamera();
    this.setupInput();
    this.buildAnims();

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);
  }

  private drawFloor() {
    const g = this.add.graphics();

    // Beige floor
    g.fillStyle(0xf3ead4, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Grid lines
    g.lineStyle(1, 0xe6dcc2, 0.6);
    for (let x = 0; x <= WORLD_COLS; x++) {
      g.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_H);
    }
    for (let y = 0; y <= WORLD_ROWS; y++) {
      g.lineBetween(0, y * TILE_SIZE, WORLD_W, y * TILE_SIZE);
    }

    // Outer wall ring (16px thick, depth 15)
    const wall = this.add.graphics();
    wall.fillStyle(0x2d2d2d, 1);
    wall.fillRect(0, 0, WORLD_W, 16);
    wall.fillRect(0, WORLD_H - 16, WORLD_W, 16);
    wall.fillRect(0, 0, 16, WORLD_H);
    wall.fillRect(WORLD_W - 16, 0, 16, WORLD_H);
    wall.setDepth(15);
  }

  private spawnPlayer() {
    const startX = WORLD_W / 2;
    const startY = WORLD_H / 2;

    this.layers = [];

    for (let i = 0; i < CG_LAYERS.length; i++) {
      const key = `cg_${CG_LAYERS[i]}`;
      const spr = this.add.sprite(startX, startY, key);
      spr.setScale(2);
      spr.setOrigin(0.5, 0.85);
      spr.setDepth(startY + 0.01 * i);
      this.layers.push(spr);
    }

    // Physics driven by the body layer
    this.physics.add.existing(this.layers[0]);
    this.body = this.layers[0] as Phaser.Physics.Arcade.Sprite;
    const pb = this.body.body as Phaser.Physics.Arcade.Body;
    pb.setSize(10, 6).setOffset(3, 24);
    pb.setCollideWorldBounds(true);
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.body, true, 0.15, 0.15);
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
      const frames = Array.from({ length: 6 }, (_, i) => ({
        key: 'cg_body',
        frame: start + i,
      }));
      this.anims.create({
        key: `walk-${dir}`,
        frames,
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  override update() {
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

      if (dir !== this.lastDir || !this.body.anims.isPlaying) {
        this.body.play(`walk-${dir}`, true);
        this.lastDir = dir;
      }
    } else {
      if (this.body.anims.isPlaying) {
        this.body.anims.stop();
        this.body.setFrame(IDLE_FRAME[this.lastDir]);
      }
    }

    (this.body.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
  }

  private onPostUpdate() {
    // frame.name is the authoritative frame id — works for both anim and idle
    const frame = this.body.frame.name;

    // Mirror frame onto overlay layers each tick
    for (let i = 1; i < this.layers.length; i++) {
      this.layers[i].setFrame(frame);
      this.layers[i].setPosition(this.body.x, this.body.y);
      this.layers[i].setDepth(this.body.y + 0.01 * i);
    }
    this.body.setDepth(this.body.y);

    // Emit position for DOM name tag
    this.events.emit('player-pos', {
      worldX: this.body.x,
      worldY: this.body.y,
    } satisfies PlayerPosEvent);
  }

  // Project world coords to canvas-relative screen coords
  static projectToScreen(
    cam: Phaser.Cameras.Scene2D.Camera,
    rect: DOMRect,
    worldX: number,
    worldY: number,
  ): { x: number; y: number } {
    const wv = cam.worldView;
    const x = rect.left + ((worldX - wv.x) / wv.width) * rect.width;
    const y = rect.top + ((worldY - wv.y) / wv.height) * rect.height;
    return { x, y };
  }

  // Expose frame col count so the sheet import can derive frame IDs
  static get FRAME_COLS() {
    return FRAME_COLS;
  }
}
