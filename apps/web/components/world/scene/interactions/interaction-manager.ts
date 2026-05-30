import { TILE_SIZE } from '../constants';
import { getDecorAsset } from '../decor-catalog';
import type { MapModel } from '../map-model';
import type { LocalPlayer } from '../player/local-player';
import type { ObjectLabelUpdate } from '../types';
import type { InteractionBehavior, InteractionContext, InteractionSpec } from './interaction-types';
import { SitBehavior } from './sit-behavior';

interface ManagerDeps {
  localPlayer: LocalPlayer;
  getModel: () => MapModel | null;
  setDecorCollision: (active: boolean) => void;
}

// float the prompt above the chair
const PROMPT_Y_OFFSET = 24;

// Drives interactive decor: finds the nearest interactable around the player,
// shows a prompt, and dispatches E to start/stop the matching behavior.
export class InteractionManager {
  private readonly registry = new Map<InteractionSpec['kind'], InteractionBehavior>();
  private activeBehavior: InteractionBehavior | null = null;
  private activeCtx: InteractionContext | null = null;
  private nearest: InteractionContext | null = null;

  constructor(private readonly deps: ManagerDeps) {
    const sit = new SitBehavior({
      localPlayer: deps.localPlayer,
      getModel: deps.getModel,
      setDecorCollision: deps.setDecorCollision,
    });
    this.registry.set('sit', sit);
  }

  // Runs each frame: cancel an active behavior on movement, else track the
  // nearest interactable for the prompt + E dispatch.
  update() {
    if (this.activeBehavior) {
      if (this.activeBehavior.update()) this.stopActive();
      return;
    }
    this.recomputeNearest();
  }

  isActive(): boolean {
    return this.activeBehavior !== null;
  }

  hasInteractableInRange(): boolean {
    return this.nearest !== null;
  }

  tryInteract() {
    if (this.activeBehavior) {
      this.stopActive();
      return;
    }
    const ctx = this.nearest;
    if (!ctx) return;
    const behavior = this.registry.get(ctx.spec.kind);
    if (behavior && behavior.canStart(ctx)) {
      behavior.start(ctx);
      this.activeBehavior = behavior;
      this.activeCtx = ctx;
    }
  }

  forceStop() {
    this.stopActive();
  }

  // Re-validate the seat after the map changed: if the decor we sit on is gone
  // or replaced, stand up in place.
  onMapChanged(model: MapModel | null) {
    if (!this.activeBehavior || !this.activeCtx) return;
    const still = model?.decorAt(this.activeCtx.tileX, this.activeCtx.tileY);
    if (!still || still.id !== this.activeCtx.decor.id) this.stopActive();
  }

  collectPromptLabel(buffer: ObjectLabelUpdate[]) {
    if (this.activeBehavior && this.activeCtx) {
      buffer.push(
        this.promptFor(this.activeBehavior.activePromptKey(this.activeCtx), this.activeCtx),
      );
      return;
    }
    if (this.nearest) {
      const behavior = this.registry.get(this.nearest.spec.kind);
      if (behavior) buffer.push(this.promptFor(behavior.promptKey(this.nearest), this.nearest));
    }
  }

  private promptFor(label: string, ctx: InteractionContext): ObjectLabelUpdate {
    return {
      id: 'interaction-prompt',
      label,
      worldX: ctx.tileX * TILE_SIZE + TILE_SIZE / 2,
      worldY: ctx.tileY * TILE_SIZE - PROMPT_Y_OFFSET,
    };
  }

  private stopActive() {
    this.activeBehavior?.stop();
    this.activeBehavior = null;
    this.activeCtx = null;
  }

  private recomputeNearest() {
    this.nearest = null;
    const model = this.deps.getModel();
    if (!model) return;

    const body = this.deps.localPlayer.body;
    const ptx = Math.floor(body.x / TILE_SIZE);
    const pty = Math.floor(body.y / TILE_SIZE);

    let bestDist = Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const decor = model.decorAt(ptx + dx, pty + dy);
        const spec = decor && getDecorAsset(decor.asset)?.interaction;
        if (!decor || !spec) continue;
        const cx = decor.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = decor.y * TILE_SIZE + TILE_SIZE / 2;
        const dist = (cx - body.x) ** 2 + (cy - body.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          this.nearest = { decor, spec, tileX: decor.x, tileY: decor.y };
        }
      }
    }
  }
}
