import Phaser from 'phaser';
import { CG_LAYER_ORDER, CG_VARIANTS, variantUrl } from '~/composables/useCharacter';
import { CG_FRAME_H, CG_FRAME_W } from '~/utils/cg-sheet';
import { TILE_SIZE } from '../constants';
import { FLOOR_CATALOG } from '../floor-catalog';
import { WALL_TEXTURE_KEYS } from '../wall-renderer';

interface PreloadHooks {
  onProgress?: (value: number) => void;
  onComplete?: () => void;
}

// Loads the always-needed world textures: characters, floors, walls. Decor is
// the heavy part (6k+ assets) and is loaded on demand by DecorTextureLoader —
// only what the map uses plus the builder's selection — so boot stays fast.
export function preloadWorldAssets(scene: Phaser.Scene, hooks: PreloadHooks = {}) {
  scene.load.on('progress', (value: number) => hooks.onProgress?.(value));
  scene.load.once('complete', () => hooks.onComplete?.());

  for (const layer of CG_LAYER_ORDER) {
    for (const variant of CG_VARIANTS[layer]) {
      scene.load.spritesheet(variant, variantUrl(layer, variant), {
        frameWidth: CG_FRAME_W,
        frameHeight: CG_FRAME_H,
      });
    }
  }
  for (const asset of FLOOR_CATALOG) {
    if (asset.url) scene.load.image(`floor:${asset.id}`, asset.url);
  }
  for (const { key, url } of WALL_TEXTURE_KEYS) {
    scene.load.spritesheet(key, url, { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
  }
}
