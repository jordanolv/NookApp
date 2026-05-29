import Phaser from 'phaser';
import type { PlayerMovedPayload } from '@nookapp/protocol';
import { DEFAULT_APPEARANCE, type Appearance } from '~/composables/useCharacter';
import type { Direction } from '~/utils/cg-sheet';
import { CharacterSprite } from '../character/character-sprite';
import type { NameTagUpdate, PlayerInteraction } from '../types';

const LERP = 0.3;

interface RemoteRecord {
  sprite: CharacterSprite;
  name: string;
  lastDir: Direction;
  targetX: number;
  targetY: number;
}

// The other players. They get position updates and glide toward them each frame.
export class RemotePlayerManager {
  private readonly players = new Map<string, RemoteRecord>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getLocalUserId: () => string,
  ) {}

  has(userId: string): boolean {
    return this.players.has(userId);
  }

  upsert(payload: PlayerMovedPayload, name: string | null) {
    if (payload.userId === this.getLocalUserId()) return;

    let remote = this.players.get(payload.userId);
    if (!remote) {
      remote = this.spawn(payload.userId, payload.x, payload.y, name ?? payload.userId);
    }
    if (name) remote.name = name;

    remote.targetX = payload.x;
    remote.targetY = payload.y;

    const dir = payload.dir as Direction;
    if (payload.moving) {
      if (dir !== remote.lastDir || !remote.sprite.isPlaying) {
        remote.sprite.playWalk(dir);
        remote.lastDir = dir;
      }
    } else if (remote.sprite.isPlaying) {
      remote.sprite.idle(dir);
    }
  }

  setAppearance(userId: string, appearance: Appearance) {
    const remote = this.players.get(userId);
    if (!remote) return;
    remote.sprite.setAppearance(appearance);
    remote.sprite.reapplyAnim(remote.lastDir);
  }

  remove(userId: string) {
    const remote = this.players.get(userId);
    if (!remote) return;
    remote.sprite.destroy();
    this.players.delete(userId);
  }

  update() {
    for (const remote of this.players.values()) {
      const body = remote.sprite.body;
      body.setPosition(
        Phaser.Math.Linear(body.x, remote.targetX, LERP),
        Phaser.Math.Linear(body.y, remote.targetY, LERP),
      );
      remote.sprite.sync();
    }
  }

  nearest(x: number, y: number, maxDist: number): PlayerInteraction | null {
    let nearest: PlayerInteraction | null = null;
    let minDist = maxDist;
    for (const [userId, remote] of this.players) {
      const dx = remote.sprite.x - x;
      const dy = remote.sprite.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = { userId, name: remote.name, worldX: remote.sprite.x, worldY: remote.sprite.y };
      }
    }
    return nearest;
  }

  collectNameTags(buffer: NameTagUpdate[]) {
    for (const [userId, remote] of this.players) {
      buffer.push({ userId, name: remote.name, worldX: remote.sprite.x, worldY: remote.sprite.y });
    }
  }

  private spawn(userId: string, x: number, y: number, name: string): RemoteRecord {
    const sprite = new CharacterSprite(this.scene, x, y, { ...DEFAULT_APPEARANCE });
    const remote: RemoteRecord = { sprite, name, lastDir: 'down', targetX: x, targetY: y };
    sprite.setInteractive(() =>
      this.scene.events.emit('player:interact', {
        userId,
        name: remote.name,
        worldX: sprite.x,
        worldY: sprite.y,
      } satisfies PlayerInteraction),
    );
    this.players.set(userId, remote);
    return remote;
  }
}
