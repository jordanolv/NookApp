import type Phaser from 'phaser';
import { type Appearance, DEFAULT_APPEARANCE } from '~/composables/useCharacter';
import { queueAppearanceSheets } from '../character/character-texture-loader';
import { TILE_SIZE } from '../constants';
import { FLOOR_CATALOG } from '../floor-catalog';
import { WALL_TEXTURE_KEYS } from '../wall-renderer';

interface PreloadHooks {
  onProgress?: (value: number) => void;
  onComplete?: () => void;
}

// Loads the always-needed world textures: the local and default characters,
// floors, walls. Decor (6k+ assets) and other players' outfits are loaded on
// demand by DecorTextureLoader / CharacterTextureLoader so boot stays fast.
export function preloadWorldAssets(
  scene: Phaser.Scene,
  appearance: Appearance,
  hooks: PreloadHooks = {},
) {
  scene.load.on('progress', (value: number) => hooks.onProgress?.(value));
  scene.load.once('complete', () => hooks.onComplete?.());

  queueAppearanceSheets(scene, appearance);
  queueAppearanceSheets(scene, DEFAULT_APPEARANCE);
  for (const asset of FLOOR_CATALOG) {
    if (asset.url) scene.load.image(`floor:${asset.id}`, asset.url);
  }
  for (const { key, url } of WALL_TEXTURE_KEYS) {
    scene.load.spritesheet(key, url, { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
  }
}
