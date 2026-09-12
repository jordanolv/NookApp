import type Phaser from 'phaser';

// Shared tail of the on-demand loaders: start the queue if anything was added
// since `queuedBefore`, and call back once it lands (or right away if nothing
// is pending). Phaser accepts new files while a load is already running.
export function flushLoader(scene: Phaser.Scene, queuedBefore: number, onLoaded?: () => void) {
  const queuedSomething = scene.load.list.size > queuedBefore;
  if (!queuedSomething && !scene.load.isLoading()) {
    onLoaded?.();
    return;
  }
  if (onLoaded) scene.load.once('complete', onLoaded);
  if (!scene.load.isLoading()) scene.load.start();
}
