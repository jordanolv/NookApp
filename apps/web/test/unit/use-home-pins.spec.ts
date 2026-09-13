import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, reactive, ref } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';
import { channel } from '../helpers/fixtures';

// The composable relies on Nuxt auto-imports; outside Nuxt they have to be
// provided as globals before the module is loaded. A reactive Map mirrors the
// useState-backed layout so the `pins` computed re-evaluates on writes.
const layoutStore = reactive(new Map<string, UiLayoutEntry>());
const ensureLoaded = vi.fn(() => Promise.resolve());

vi.stubGlobal('computed', computed);
vi.stubGlobal('useUiLayout', () => ({
  ensureLoaded,
  get: (key: string) => layoutStore.get(key) ?? null,
  entriesByPrefix: (prefix: string) =>
    [...layoutStore.entries()].filter(([key]) => key.startsWith(prefix)),
  set: (key: string, value: UiLayoutEntry) => layoutStore.set(key, value),
  remove: (key: string) => layoutStore.delete(key),
}));

const { useHomePins } = await import('../../composables/useHomePins');

describe('useHomePins', () => {
  beforeEach(() => {
    layoutStore.clear();
    ensureLoaded.mockClear();
  });

  describe('pinChannel', () => {
    it('pins a channel and exposes it with its metadata', () => {
      const pins = useHomePins('s1');
      pins.pinChannel(channel());
      expect(pins.pins.value).toHaveLength(1);
      const pin = pins.pins.value[0];
      expect(pin.key).toBe('home-pin:s1:channel:c1');
      expect(pin.kind).toBe('channel');
      expect(pin.channelId).toBe('c1');
      expect(pin.title).toBe('general');
      expect(pin.parentId).toBeNull();
      expect(pin.parentName).toBeNull();
      expect(typeof pin.createdAt).toBe('number');
    });

    it('records the parent channel and its display name', () => {
      const pins = useHomePins('s1');
      pins.pinChannel(channel({ id: 'c2', name: 'thread', parentId: 'c1' }), 'channel', 'general');
      expect(pins.pins.value[0]).toMatchObject({ parentId: 'c1', parentName: 'general' });
    });

    it('keeps a game pin and a channel pin for the same channel apart', () => {
      const pins = useHomePins('s1');
      pins.pinChannel(channel(), 'channel');
      pins.pinChannel(channel(), 'game');
      expect(pins.pins.value.map((p) => p.kind).sort()).toEqual(['channel', 'game']);
      expect(pins.isPinned('c1', 'channel')).toBe(true);
      expect(pins.isPinned('c1', 'game')).toBe(true);
    });
  });

  describe('isPinned', () => {
    it('is false for a channel that was never pinned', () => {
      expect(useHomePins('s1').isPinned('c1')).toBe(false);
    });

    it('defaults to the channel kind', () => {
      const pins = useHomePins('s1');
      pins.pinChannel(channel(), 'game');
      expect(pins.isPinned('c1')).toBe(false);
      expect(pins.isPinned('c1', 'game')).toBe(true);
    });
  });

  describe('unpin', () => {
    it('removes only the targeted pin', () => {
      const pins = useHomePins('s1');
      pins.pinChannel(channel());
      pins.pinChannel(channel({ id: 'c2', name: 'random' }));
      pins.unpin('c1');
      expect(pins.pins.value.map((p) => p.channelId)).toEqual(['c2']);
    });

    it('ignores a channel that is not pinned', () => {
      const pins = useHomePins('s1');
      pins.pinChannel(channel());
      pins.unpin('ghost');
      expect(pins.pins.value).toHaveLength(1);
    });
  });

  describe('toggleChannel', () => {
    it('pins when absent and unpins when present', () => {
      const pins = useHomePins('s1');
      pins.toggleChannel(channel());
      expect(pins.isPinned('c1')).toBe(true);
      pins.toggleChannel(channel());
      expect(pins.isPinned('c1')).toBe(false);
    });
  });

  describe('pins', () => {
    it('sorts by pin creation time, oldest first', () => {
      layoutStore.set('home-pin:s1:channel:c2', {
        kind: 'channel',
        channelId: 'c2',
        title: 'B',
        createdAt: 200,
      });
      layoutStore.set('home-pin:s1:channel:c1', {
        kind: 'channel',
        channelId: 'c1',
        title: 'A',
        createdAt: 100,
      });
      expect(useHomePins('s1').pins.value.map((p) => p.channelId)).toEqual(['c1', 'c2']);
    });

    it('skips malformed layout entries', () => {
      layoutStore.set('home-pin:s1:channel:c1', { kind: 'note', channelId: 'c1', title: 'A' });
      layoutStore.set('home-pin:s1:channel:c2', { kind: 'channel', title: 'B' });
      layoutStore.set('home-pin:s1:channel:c3', { kind: 'channel', channelId: 'c3', title: 7 });
      layoutStore.set('home-pin:s1:channel:c4', { kind: 'channel', channelId: 'c4', title: 'D' });
      expect(useHomePins('s1').pins.value.map((p) => p.channelId)).toEqual(['c4']);
    });

    it('falls back to null parents and a zero timestamp on loose entries', () => {
      layoutStore.set('home-pin:s1:game:c1', {
        kind: 'game',
        channelId: 'c1',
        title: 'A',
        parentId: 42,
        parentName: true,
        createdAt: 'nope',
      });
      expect(useHomePins('s1').pins.value[0]).toMatchObject({
        kind: 'game',
        parentId: null,
        parentName: null,
        createdAt: 0,
      });
    });

    it('only surfaces pins of the requested server', () => {
      const pins = useHomePins('s1');
      pins.pinChannel(channel());
      layoutStore.set('home-pin:s2:channel:c9', { kind: 'channel', channelId: 'c9', title: 'X' });
      layoutStore.set('panel:chat', { x: 10, y: 20 });
      expect(pins.pins.value.map((p) => p.channelId)).toEqual(['c1']);
    });

    it('follows a reactive serverId source', () => {
      const serverId = ref('s1');
      const pins = useHomePins(serverId);
      pins.pinChannel(channel());
      serverId.value = 's2';
      expect(pins.pins.value).toEqual([]);
      expect(pins.isPinned('c1')).toBe(false);
      serverId.value = 's1';
      expect(pins.pins.value.map((p) => p.channelId)).toEqual(['c1']);
    });
  });

  it('re-exposes the layout loader', () => {
    expect(useHomePins('s1').ensureLoaded).toBe(ensureLoaded);
  });
});
