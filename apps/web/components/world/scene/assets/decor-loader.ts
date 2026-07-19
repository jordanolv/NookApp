import Phaser from 'phaser';
import { getDecorAsset } from '../decor-catalog';
import { decorCellTextureKey } from '../decor-renderer';

// The decor catalog is huge (6k+ assets). Instead of preloading every texture
// at boot we load on demand: the textures a map actually uses, plus whatever
// the builder selects. Both the renderer and the ghost already skip missing
// textures, so an unfinished load just renders nothing until it arrives.
export class DecorTextureLoader {
  private requested = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {}

  ensure(decorIds: Iterable<string>, onLoaded?: () => void) {
    const before = this.scene.load.list.size;
    for (const id of decorIds) {
      if (this.requested.has(id)) continue;
      this.requested.add(id);
      const asset = getDecorAsset(id);
      if (!asset) continue;
      for (const cell of asset.cells) {
        const key = decorCellTextureKey(asset.id, cell.dx, cell.dy);
        if (!this.scene.textures.exists(key)) this.scene.load.image(key, cell.file);
      }
    }

    const queuedSomething = this.scene.load.list.size > before;
    if (!queuedSomething && !this.scene.load.isLoading()) {
      onLoaded?.();
      return;
    }
    if (onLoaded) this.scene.load.once(Phaser.Loader.Events.COMPLETE, onLoaded);
    if (!this.scene.load.isLoading()) this.scene.load.start();
  }
}
