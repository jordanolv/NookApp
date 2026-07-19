import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useServersStore } from '../../stores/servers';
import { category, channel, server } from '../helpers/fixtures';

describe('servers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('channel getters', () => {
    beforeEach(() => {
      useServersStore().setChannels([
        channel({ id: 't1', type: 'text' }),
        channel({ id: 'v1', type: 'voice' }),
        channel({ id: 'f1', type: 'forum' }),
        channel({ id: 'g1', type: 'game' }),
        channel({ id: 'post1', type: 'text', parentId: 'f1' }),
      ]);
    });

    it('splits the channels by type', () => {
      const store = useServersStore();
      expect(store.textChannels.map((c) => c.id)).toEqual(['t1']);
      expect(store.voiceChannels.map((c) => c.id)).toEqual(['v1']);
      expect(store.forumChannels.map((c) => c.id)).toEqual(['f1']);
      expect(store.gameChannels.map((c) => c.id)).toEqual(['g1']);
    });

    it('keeps forum posts out of the top-level lists', () => {
      expect(useServersStore().textChannels.map((c) => c.id)).not.toContain('post1');
    });

    it('lists the posts of a parent forum', () => {
      const store = useServersStore();
      expect(store.postChannels('f1').map((c) => c.id)).toEqual(['post1']);
      expect(store.postChannels('unknown')).toEqual([]);
    });
  });

  describe('setList', () => {
    it('marks the store ready even when the user owns no server', () => {
      const store = useServersStore();
      expect(store.ready).toBe(false);
      store.setList([]);
      expect(store.ready).toBe(true);
    });
  });

  describe('setCurrent', () => {
    it('keeps the loaded channels while a server stays selected', () => {
      const store = useServersStore();
      store.setChannels([channel()]);
      store.setCategories([category()]);
      store.setCurrent(server());
      expect(store.channels).toHaveLength(1);
      expect(store.categories).toHaveLength(1);
    });

    it('clears channels and categories when leaving a server', () => {
      const store = useServersStore();
      store.setChannels([channel()]);
      store.setCategories([category()]);
      store.setCurrent(null);
      expect(store.channels).toEqual([]);
      expect(store.categories).toEqual([]);
    });
  });

  describe('category mutations', () => {
    it('appends an unknown category and replaces a known one', () => {
      const store = useServersStore();
      store.upsertCategory(category({ id: 'cat1', name: 'General' }));
      store.upsertCategory(category({ id: 'cat1', name: 'Renamed' }));
      store.upsertCategory(category({ id: 'cat2' }));
      expect(store.categories.map((c) => c.name)).toEqual(['Renamed', 'General']);
    });

    it('removes only the targeted category', () => {
      const store = useServersStore();
      store.setCategories([category({ id: 'cat1' }), category({ id: 'cat2' })]);
      store.removeCategory('cat1');
      store.removeCategory('ghost');
      expect(store.categories.map((c) => c.id)).toEqual(['cat2']);
    });
  });

  describe('server mutations', () => {
    it('appends an unknown server and replaces a known one', () => {
      const store = useServersStore();
      store.upsertServer(server({ id: 's1', name: 'Nook' }));
      store.upsertServer(server({ id: 's1', name: 'Renamed' }));
      store.upsertServer(server({ id: 's2' }));
      expect(store.list.map((s) => s.name)).toEqual(['Renamed', 'Nook']);
    });

    it('deselects the current server when it is the one removed', () => {
      const store = useServersStore();
      store.setList([server({ id: 's1' }), server({ id: 's2' })]);
      store.setCurrent(server({ id: 's1' }));
      store.removeServer('s1');
      expect(store.list.map((s) => s.id)).toEqual(['s2']);
      expect(store.current).toBeNull();
    });

    it('leaves the current server alone when another one is removed', () => {
      const store = useServersStore();
      store.setList([server({ id: 's1' }), server({ id: 's2' })]);
      store.setCurrent(server({ id: 's1' }));
      store.removeServer('s2');
      expect(store.current?.id).toBe('s1');
    });
  });
});
