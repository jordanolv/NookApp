import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { message } from '../helpers/fixtures';

// The composable relies on Nuxt auto-imports; outside Nuxt they have to be
// provided as globals before the module is loaded.
const states = new Map<string, Ref<unknown>>();
const apiGet = vi.fn();
const apiPut = vi.fn(() => Promise.resolve());

vi.stubGlobal('useState', <T>(key: string, init: () => T): Ref<T> => {
  if (!states.has(key)) states.set(key, ref(init()) as Ref<unknown>);
  return states.get(key) as Ref<T>;
});
vi.stubGlobal('useApi', () => ({ get: apiGet, put: apiPut }));

const { useChannelReadState } = await import('../../composables/useChannelReadState');

describe('useChannelReadState', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    states.clear();
    apiGet.mockReset();
    apiPut.mockClear();
    useAuthStore().setUser({
      id: 'me',
      email: 'me@nookapp.eu',
      name: 'Me',
      username: 'me',
      avatarUrl: null,
      emailVerified: true,
      onboardedAt: null,
      createdAt: '2026-07-19T09:00:00.000Z',
    });
  });

  describe('loadUnread', () => {
    it('exposes the counters returned by the server', async () => {
      apiGet.mockResolvedValue({ c1: { messages: 4, mentions: 1 } });
      const state = useChannelReadState();
      await state.loadUnread('s1');
      expect(apiGet).toHaveBeenCalledWith('/servers/s1/unread');
      expect(state.unreadCount('c1')).toBe(4);
      expect(state.mentionCount('c1')).toBe(1);
    });

    it('falls back to empty counters when the request fails', async () => {
      apiGet.mockRejectedValue(new Error('offline'));
      const state = useChannelReadState();
      await state.loadUnread('s1');
      expect(state.unread.value).toEqual({});
    });

    it('reports zero for a channel the server did not list', () => {
      const state = useChannelReadState();
      expect(state.unreadCount('c1')).toBe(0);
      expect(state.mentionCount('c1')).toBe(0);
      expect(state.isUnread('c1')).toBe(false);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('markRead', () => {
    it('clears the counters and tells the server', async () => {
      vi.useFakeTimers();
      apiGet.mockResolvedValue({ c1: { messages: 3, mentions: 2 } });
      const state = useChannelReadState();
      await state.loadUnread('s1');
      state.markRead('c1');
      expect(state.unreadCount('c1')).toBe(0);
      expect(state.mentionCount('c1')).toBe(0);
      vi.runAllTimers();
      expect(apiPut).toHaveBeenCalledWith('/servers/s1/channels/c1/read', {});
    });

    it('collapses repeated marks of the same channel into one write', async () => {
      apiGet.mockResolvedValue({});
      const state = useChannelReadState();
      await state.loadUnread('s1');
      vi.useFakeTimers();
      state.markRead('c1');
      state.markRead('c1');
      state.markRead('c1');
      vi.runAllTimers();
      expect(apiPut).toHaveBeenCalledTimes(1);
    });

    it('leaves the other channels untouched', async () => {
      apiGet.mockResolvedValue({
        c1: { messages: 1, mentions: 0 },
        c2: { messages: 5, mentions: 1 },
      });
      const state = useChannelReadState();
      await state.loadUnread('s1');
      state.markRead('c1');
      expect(state.unreadCount('c2')).toBe(5);
    });
  });

  describe('noteIncoming', () => {
    it('counts a message from someone else', () => {
      const state = useChannelReadState();
      state.noteIncoming(message({ authorId: 'other' }));
      expect(state.unreadCount('c1')).toBe(1);
      expect(state.mentionCount('c1')).toBe(0);
    });

    it('counts a mention on top of the message', () => {
      const state = useChannelReadState();
      state.noteIncoming(message({ authorId: 'other', mentions: ['me'] }));
      expect(state.unreadCount('c1')).toBe(1);
      expect(state.mentionCount('c1')).toBe(1);
    });

    it('ignores a mention aimed at somebody else', () => {
      const state = useChannelReadState();
      state.noteIncoming(message({ authorId: 'other', mentions: ['someone'] }));
      expect(state.mentionCount('c1')).toBe(0);
    });

    it('never counts the reader own messages', () => {
      const state = useChannelReadState();
      state.noteIncoming(message({ authorId: 'me', mentions: ['me'] }));
      expect(state.unreadCount('c1')).toBe(0);
    });

    it('ignores a channel currently on screen', () => {
      const state = useChannelReadState();
      state.setViewing('c1', true);
      state.noteIncoming(message({ authorId: 'other', mentions: ['me'] }));
      expect(state.unreadCount('c1')).toBe(0);
      expect(state.isViewing('c1')).toBe(true);
      state.setViewing('c1', false);
      expect(state.isViewing('c1')).toBe(false);
    });
  });
});
