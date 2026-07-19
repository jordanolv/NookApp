import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagesStore } from '../../stores/messages';
import { message } from '../helpers/fixtures';

describe('messages store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('forChannel', () => {
    it('returns the messages held for a channel', () => {
      const store = useMessagesStore();
      store.setMessages('c1', [message({ id: 'm1' })]);
      expect(store.forChannel('c1')).toHaveLength(1);
    });

    it('returns an empty list for an unknown channel', () => {
      expect(useMessagesStore().forChannel('nope')).toEqual([]);
    });
  });

  describe('appendMessage', () => {
    it('adds to an existing channel list', () => {
      const store = useMessagesStore();
      store.setMessages('c1', [message({ id: 'm1' })]);
      store.appendMessage('c1', message({ id: 'm2' }));
      expect(store.forChannel('c1').map((m) => m.id)).toEqual(['m1', 'm2']);
    });

    it('creates the channel list on the first message', () => {
      const store = useMessagesStore();
      store.appendMessage('c9', message({ id: 'm1', channelId: 'c9' }));
      expect(store.forChannel('c9')).toHaveLength(1);
    });
  });

  describe('updateMessage', () => {
    it('replaces the matching message in place', () => {
      const store = useMessagesStore();
      store.setMessages('c1', [message({ id: 'm1' }), message({ id: 'm2' })]);
      store.updateMessage('c1', message({ id: 'm2', content: 'edited' }));
      expect(store.forChannel('c1')[1]!.content).toBe('edited');
      expect(store.forChannel('c1')[0]!.content).toBe('hello');
    });

    it('ignores an update for an unknown channel or unknown message', () => {
      const store = useMessagesStore();
      store.setMessages('c1', [message({ id: 'm1' })]);
      store.updateMessage('other', message({ id: 'm1', content: 'edited' }));
      store.updateMessage('c1', message({ id: 'ghost', content: 'edited' }));
      expect(store.forChannel('c1')).toEqual([message({ id: 'm1' })]);
      expect(store.forChannel('other')).toEqual([]);
    });
  });

  describe('removeMessage', () => {
    it('drops the message and decrements the channel count', () => {
      const store = useMessagesStore();
      store.setMessages('c1', [message({ id: 'm1' }), message({ id: 'm2' })]);
      store.setCounts({ c1: 2 });
      store.removeMessage('c1', 'm1');
      expect(store.forChannel('c1').map((m) => m.id)).toEqual(['m2']);
      expect(store.countFor('c1')).toBe(1);
    });

    it('never drives the count below zero when it is already at zero', () => {
      const store = useMessagesStore();
      store.setMessages('c1', [message({ id: 'm1' })]);
      store.removeMessage('c1', 'm1');
      expect(store.countFor('c1')).toBe(0);
    });

    it('is a no-op for an unknown channel', () => {
      const store = useMessagesStore();
      store.removeMessage('nope', 'm1');
      expect(store.forChannel('nope')).toEqual([]);
    });
  });

  describe('loading flags', () => {
    it('tracks the loading state per channel', () => {
      const store = useMessagesStore();
      store.setLoading('c1', true);
      expect(store.isLoading('c1')).toBe(true);
      store.setLoading('c1', false);
      expect(store.isLoading('c1')).toBe(false);
    });

    it('reports an untouched channel as not loading', () => {
      expect(useMessagesStore().isLoading('c1')).toBe(false);
    });
  });

  describe('counts', () => {
    it('replaces the whole count map rather than merging into it', () => {
      const store = useMessagesStore();
      store.setCounts({ c1: 5, c2: 3 });
      store.setCounts({ c2: 7 });
      expect(store.countFor('c1')).toBe(0);
      expect(store.countFor('c2')).toBe(7);
    });

    it('starts an unseen channel at one when incremented', () => {
      const store = useMessagesStore();
      store.incrementCount('c1');
      store.incrementCount('c1');
      expect(store.countFor('c1')).toBe(2);
    });
  });
});
