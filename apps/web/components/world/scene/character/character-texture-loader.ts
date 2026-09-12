import type Phaser from 'phaser';
import { CG_LAYER_ORDER, type Appearance, variantUrl } from '~/composables/useCharacter';
import { CG_FRAME_H, CG_FRAME_W } from '~/utils/cg-sheet';
import { flushLoader } from '../assets/loader-flush';

export function queueAppearanceSheets(scene: Phaser.Scene, appearance: Appearance) {
  for (const layer of CG_LAYER_ORDER) {
    const variant = appearance[layer];
    if (!variant || scene.textures.exists(variant)) continue;
    scene.load.spritesheet(variant, variantUrl(layer, variant), {
      frameWidth: CG_FRAME_W,
      frameHeight: CG_FRAME_H,
    });
  }
}

// The generator has 82 sheets; a player only ever needs 5. Boot preloads the
// local and default appearances, everything else is fetched here when a
// player actually wears it.
export class CharacterTextureLoader {
  constructor(private readonly scene: Phaser.Scene) {}

  ensure(appearance: Appearance, onLoaded: () => void) {
    const before = this.scene.load.list.size;
    queueAppearanceSheets(this.scene, appearance);
    flushLoader(this.scene, before, onLoaded);
  }
}
