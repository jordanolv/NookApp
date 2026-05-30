// Contracts for the interactive-object framework. Kept Phaser-free so the decor
// catalog can import InteractionSpec without a dependency cycle.
import type { DecorObject } from '@nookapp/protocol';
import type { Direction } from '~/utils/cg-sheet';

export interface SitInteraction {
  kind: 'sit';
  // direction the seated character faces (chair art faces the camera by default)
  facing?: Direction;
  // pixel nudge of the seated sprite onto the seat, if a chair needs it
  seatOffset?: { x: number; y: number };
}

// Discriminated union — add MediaInteraction etc. here without touching call sites.
export type InteractionSpec = SitInteraction;

export interface InteractionContext {
  decor: DecorObject;
  spec: InteractionSpec;
  tileX: number;
  tileY: number;
}

export interface InteractionBehavior {
  readonly kind: InteractionSpec['kind'];
  // i18n key for the "press E to …" prompt while standing in range
  promptKey(ctx: InteractionContext): string;
  // i18n key for the prompt shown while the behavior is active
  activePromptKey(ctx: InteractionContext): string;
  canStart(ctx: InteractionContext): boolean;
  start(ctx: InteractionContext): void;
  stop(): void;
  isActive(): boolean;
  // called every frame while active; return true to request a stop (e.g. the
  // player pressed a movement key)
  update(): boolean;
}
