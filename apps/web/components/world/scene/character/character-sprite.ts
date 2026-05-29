import Phaser from 'phaser';
import { CG_LAYER_ORDER, type Appearance, type CgLayer } from '~/composables/useCharacter';
import {
  CG_WALK_FRAME_RATE,
  DIRECTIONS,
  idleFrame,
  walkAnimKey,
  walkFrames,
  type Direction,
} from '~/utils/cg-sheet';

const LAYER_SCALE = 2;
const LAYER_ORIGIN_X = 0.5;
const LAYER_ORIGIN_Y = 0.85;
// tiny gap so the layers always stack in the right order
const LAYER_DEPTH_STEP = 0.01;

// small hitbox at the feet, not the whole sprite
const BODY_SIZE = { w: 10, h: 6 };
const BODY_OFFSET = { x: 3, y: 24 };

export function ensureWalkAnims(scene: Phaser.Scene, bodyKey: string) {
  for (const dir of DIRECTIONS) {
    const key = walkAnimKey(dir, bodyKey);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: walkFrames(dir).map((frame) => ({ key: bodyKey, frame })),
      frameRate: CG_WALK_FRAME_RATE,
      repeat: -1,
    });
  }
}

// A character = 5 sprites stacked (body, eyes, outfit, hair, accessory). The
// body plays the animation and the others just copy its frame.
export class CharacterSprite {
  private readonly layers: (Phaser.GameObjects.Sprite | null)[];
  private appearance: Appearance;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    appearance: Appearance,
    private readonly opts: { physics?: boolean } = {},
  ) {
    this.appearance = { ...appearance };
    this.layers = CG_LAYER_ORDER.map((layer, i) => {
      const variant = appearance[layer as CgLayer];
      return variant ? this.createLayer(variant, x, y, i) : null;
    });
    if (opts.physics) this.attachPhysics();
    ensureWalkAnims(scene, appearance.body);
  }

  private createLayer(variant: string, x: number, y: number, i: number): Phaser.GameObjects.Sprite {
    return this.scene.add
      .sprite(x, y, variant)
      .setScale(LAYER_SCALE)
      .setOrigin(LAYER_ORIGIN_X, LAYER_ORIGIN_Y)
      .setDepth(y + LAYER_DEPTH_STEP * i);
  }

  private attachPhysics() {
    const body = this.layers[0]!;
    this.scene.physics.add.existing(body);
    const pb = body.body as Phaser.Physics.Arcade.Body;
    pb.setSize(BODY_SIZE.w, BODY_SIZE.h).setOffset(BODY_OFFSET.x, BODY_OFFSET.y);
    pb.setCollideWorldBounds(true);
  }

  get body(): Phaser.GameObjects.Sprite {
    return this.layers[0]!;
  }

  // Layer 0 carries the Arcade body when constructed with { physics: true }.
  get physicsBody(): Phaser.Physics.Arcade.Sprite {
    return this.layers[0] as unknown as Phaser.Physics.Arcade.Sprite;
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  get isPlaying(): boolean {
    return this.body.anims.isPlaying;
  }

  setAppearance(appearance: Appearance) {
    this.appearance = { ...appearance };
    ensureWalkAnims(this.scene, appearance.body);
    const { x, y } = this.body;
    for (let i = 0; i < CG_LAYER_ORDER.length; i++) {
      const variant = appearance[CG_LAYER_ORDER[i] as CgLayer];
      const existing = this.layers[i];
      if (variant) {
        // swap the texture instead of recreating, so the body keeps its hitbox
        if (existing) existing.setTexture(variant);
        else {
          this.layers[i] = this.createLayer(variant, x, y, i);
          if (i === 0 && this.opts.physics) this.attachPhysics();
        }
      } else if (existing) {
        existing.destroy();
        this.layers[i] = null;
      }
    }
  }

  playWalk(dir: Direction) {
    this.body.play(walkAnimKey(dir, this.appearance.body), true);
  }

  idle(dir: Direction) {
    this.body.anims.stop();
    this.body.setFrame(idleFrame(dir));
  }

  // keep walking or stay idle after the outfit changed
  reapplyAnim(dir: Direction) {
    if (this.isPlaying) this.playWalk(dir);
    else this.idle(dir);
  }

  setInteractive(onClick: () => void) {
    this.body.setInteractive();
    this.body.on('pointerdown', onClick);
  }

  // round to whole pixels (keeps it sharp) and copy the body onto the layers
  sync() {
    const sx = Math.round(this.body.x);
    const sy = Math.round(this.body.y);
    this.body.setPosition(sx, sy);
    const frame = this.body.frame.name;
    for (let i = 1; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (!layer) continue;
      layer.setFrame(frame).setPosition(sx, sy);
      layer.setDepth(sy + LAYER_DEPTH_STEP * i);
    }
    this.body.setDepth(sy);
  }

  destroy() {
    for (const layer of this.layers) layer?.destroy();
  }
}
