import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { flushLoader } from '~/components/world/scene/assets/loader-flush';

function fakeScene(queued: number, loading: boolean) {
  const load = {
    list: { size: queued },
    isLoading: () => loading,
    once: vi.fn(),
    start: vi.fn(),
  };
  return { scene: { load } as unknown as Phaser.Scene, load };
}

describe('flushLoader', () => {
  it('calls back immediately when nothing was queued and the loader is idle', () => {
    const { scene, load } = fakeScene(3, false);
    const cb = vi.fn();
    flushLoader(scene, 3, cb);
    expect(cb).toHaveBeenCalledOnce();
    expect(load.start).not.toHaveBeenCalled();
  });

  it('starts the loader and defers the callback when files were queued', () => {
    const { scene, load } = fakeScene(5, false);
    const cb = vi.fn();
    flushLoader(scene, 3, cb);
    expect(cb).not.toHaveBeenCalled();
    expect(load.once).toHaveBeenCalledWith('complete', cb);
    expect(load.start).toHaveBeenCalledOnce();
  });

  it('does not restart a loader that is already running', () => {
    const { scene, load } = fakeScene(5, true);
    flushLoader(scene, 3, vi.fn());
    expect(load.start).not.toHaveBeenCalled();
    expect(load.once).toHaveBeenCalledOnce();
  });
});
