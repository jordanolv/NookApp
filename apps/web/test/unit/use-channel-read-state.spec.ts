import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { useMessagesStore } from '../../stores/messages';
import { message } from '../helpers/fixtures';

// The composable relies on Nuxt auto-imports; outside Nuxt they have to be
// provided as globals before the module is loaded.
const states = new Map<string, Ref<unknown>>();
const uiLayoutStore = new Map<string, unknown>();
const uiLayoutSet = vi.fn((key: string, value: unknown) => uiLayoutStore.set(key, value));

vi.stubGlobal('useState', <T>(key: string, init: () => T): Ref<T> => {
  if (!states.has(key)) states.set(key, ref(init()) as Ref<unknown>);
  return states.get(key) as Ref<T>;
});
vi.stubGlobal('useUiLayout', () => ({
  ensureLoaded: () => Promise.resolve(),
  get: (key: string) => uiLayoutStore.get(key) ?? null,
  set: uiLayoutSet,
}));
vi.stubGlobal('useMessagesStore', () => useMessagesStore());

const { useChannelReadState } = await import('../../composables/useChannelReadState');

describe('useChannelReadState', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    states.clear();
    uiLayoutStore.clear();
    uiLayoutSet.mockClear();
    useAuthStore().setUser({
      id: 'me',
      email: 'me@nookapp.eu',
      name: 'Me',
      username: 'me',
      avatarUrl: null,
      emailVerified: true,
      createdAt: '2026-07-19T09:00:00.000Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('markRead', () => {
    it('records the current time for the channel and persists it', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-19T12:00:00.000Z'));
      const state = useChannelReadState();
      state.markRead('c1');
      expect(state.lastSeen.value.c1).toBe('2026-07-19T12:00:00.000Z');
      expect(uiLayoutSet).toHaveBeenCalledWith('channels:lastSeen', state.lastSeen.value);
    });

    it('keeps the marks of the other channels', () => {
      const state = useChannelReadState();
      state.markRead('c1');
      state.markRead('c2');
      expect(Object.keys(state.lastSeen.value).sort()).toEqual(['c1', 'c2']);
    });
  });

  describe('isUnread', () => {
    it('flags a never-opened channel that has a message', () => {
      expect(useChannelReadState().isUnread('c1', '2026-07-19T10:00:00.000Z')).toBe(true);
    });

    it('is false for a channel with no message at all', () => {
      const state = useChannelReadState();
      expect(state.isUnread('c1', null)).toBe(false);
      expect(state.isUnread('c1', undefined)).toBe(false);
    });

    it('compares the last message against the last seen timestamp', () => {
      const state = useChannelReadState();
      state.lastSeen.value = { c1: '2026-07-19T11:00:00.000Z' };
      expect(state.isUnread('c1', '2026-07-19T12:00:00.000Z')).toBe(true);
      expect(state.isUnread('c1', '2026-07-19T10:00:00.000Z')).toBe(false);
    });

    it('treats a message seen at the exact same instant as read', () => {
      const state = useChannelReadState();
      state.lastSeen.value = { c1: '2026-07-19T11:00:00.000Z' };
      expect(state.isUnread('c1', '2026-07-19T11:00:00.000Z')).toBe(false);
    });
  });

  describe('unreadCount', () => {
    it('counts the loaded messages posted after the last visit', () => {
      useMessagesStore().setMessages('c1', [
        message({ id: 'm1', authorId: 'other', createdAt: '2026-07-19T10:00:00.000Z' }),
        message({ id: 'm2', authorId: 'other', createdAt: '2026-07-19T12:00:00.000Z' }),
        message({ id: 'm3', authorId: 'other', createdAt: '2026-07-19T13:00:00.000Z' }),
      ]);
      const state = useChannelReadState();
      state.lastSeen.value = { c1: '2026-07-19T11:00:00.000Z' };
      expect(state.unreadCount('c1', '2026-07-19T13:00:00.000Z')).toBe(2);
    });

    it('never counts the reader own messages', () => {
      useMessagesStore().setMessages('c1', [
        message({ id: 'm1', authorId: 'me', createdAt: '2026-07-19T12:00:00.000Z' }),
        message({ id: 'm2', authorId: 'other', createdAt: '2026-07-19T12:00:00.000Z' }),
      ]);
      const state = useChannelReadState();
      state.lastSeen.value = { c1: '2026-07-19T11:00:00.000Z' };
      expect(state.unreadCount('c1', '2026-07-19T12:00:00.000Z')).toBe(1);
    });

    it('counts every loaded message when the channel was never opened', () => {
      useMessagesStore().setMessages('c1', [
        message({ id: 'm1', authorId: 'other' }),
        message({ id: 'm2', authorId: 'other' }),
      ]);
      expect(useChannelReadState().unreadCount('c1', '2026-07-19T10:00:00.000Z')).toBe(2);
    });

    it('degrades to a single-badge estimate when no message is loaded', () => {
      const state = useChannelReadState();
      expect(state.unreadCount('c1', '2026-07-19T10:00:00.000Z')).toBe(1);
      state.lastSeen.value = { c1: '2026-07-19T11:00:00.000Z' };
      expect(state.unreadCount('c1', '2026-07-19T10:00:00.000Z')).toBe(0);
    });

    it('is zero for a channel with neither loaded messages nor activity', () => {
      expect(useChannelReadState().unreadCount('c1', null)).toBe(0);
    });
  });
});
