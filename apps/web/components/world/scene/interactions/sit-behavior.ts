import { TILE_SIZE } from '../constants';
import type { MapModel } from '../map-model';
import type { LocalPlayer } from '../player/local-player';
import type { InteractionBehavior, InteractionContext } from './interaction-types';

interface SitDeps {
  localPlayer: LocalPlayer;
  getModel: () => MapModel | null;
  // toggle the decor collider so the player can sit on the (otherwise solid) chair tile
  setDecorCollision: (active: boolean) => void;
}

// Sit on a chair: snap onto the seat, lock movement, hold a static seated frame.
// Stand up on E or any movement key, returning to where the player came from.
export class SitBehavior implements InteractionBehavior {
  readonly kind = 'sit' as const;
  private active = false;
  private standX = 0;
  private standY = 0;

  constructor(private readonly deps: SitDeps) {}

  promptKey(): string {
    return 'world.interact.sit';
  }

  activePromptKey(): string {
    return 'world.interact.stand';
  }

  canStart(): boolean {
    return !this.active;
  }

  isActive(): boolean {
    return this.active;
  }

  start(ctx: InteractionContext) {
    const lp = this.deps.localPlayer;
    this.standX = lp.body.x;
    this.standY = lp.body.y;
    this.active = true;
    this.deps.setDecorCollision(false);

    const dir = ctx.spec.facing ?? 'down';
    const ox = ctx.spec.seatOffset?.x ?? 0;
    const oy = ctx.spec.seatOffset?.y ?? 0;
    const seatX = ctx.tileX * TILE_SIZE + TILE_SIZE / 2 + ox;
    const seatY = ctx.tileY * TILE_SIZE + TILE_SIZE / 2 + oy;
    lp.sit(seatX, seatY, dir);
  }

  update(): boolean {
    return this.deps.localPlayer.movementRequested();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.deps.setDecorCollision(true);
    this.deps.localPlayer.stand(this.standX, this.standY);
    const model = this.deps.getModel();
    if (model) this.deps.localPlayer.unstickFrom(model);
  }
}
