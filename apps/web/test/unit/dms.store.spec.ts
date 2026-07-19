import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDmsStore } from '../../stores/dms';
import { conversation, directMessage, dmUser } from '../helpers/fixtures';

describe('dms store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('sortedConversations', () => {
    it('puts the most recently active conversation first', () => {
      const store = useDmsStore();
      store.setConversations([
        conversation({ id: 'old', lastMessageAt: '2026-07-19T08:00:00.000Z' }),
        conversation({ id: 'new', lastMessageAt: '2026-07-19T12:00:00.000Z' }),
      ]);
      expect(store.sortedConversations.map((c) => c.id)).toEqual(['new', 'old']);
    });

    it('does not mutate the underlying list order', () => {
      const store = useDmsStore();
      store.setConversations([
        conversation({ id: 'old', lastMessageAt: '2026-07-19T08:00:00.000Z' }),
        conversation({ id: 'new', lastMessageAt: '2026-07-19T12:00:00.000Z' }),
      ]);
      void store.sortedConversations;
      expect(store.conversations.map((c) => c.id)).toEqual(['old', 'new']);
    });
  });

  describe('totalUnread', () => {
    it('sums the unread counters across conversations', () => {
      const store = useDmsStore();
      store.setConversations([
        conversation({ id: 'a', unreadCount: 2 }),
        conversation({ id: 'b', unreadCount: 3 }),
      ]);
      expect(store.totalUnread).toBe(5);
    });

    it('is zero with no conversations', () => {
      expect(useDmsStore().totalUnread).toBe(0);
    });
  });

  describe('upsertConversation', () => {
    it('appends a conversation that is not known yet', () => {
      const store = useDmsStore();
      store.upsertConversation(conversation({ id: 'a' }));
      expect(store.conversations).toHaveLength(1);
    });

    it('replaces an existing conversation instead of duplicating it', () => {
      const store = useDmsStore();
      store.upsertConversation(conversation({ id: 'a' }));
      store.upsertConversation(conversation({ id: 'a', otherUser: dmUser({ name: 'Grace' }) }));
      expect(store.conversations).toHaveLength(1);
      expect(store.conversations[0]!.otherUser.name).toBe('Grace');
    });
  });

  describe('appendMessage', () => {
    it('appends to a loaded conversation', () => {
      const store = useDmsStore();
      store.setMessages('conv1', []);
      store.appendMessage('conv1', directMessage({ id: 'dm1' }));
      expect(store.forConversation('conv1')).toHaveLength(1);
    });

    it('skips a duplicate id so an echoed socket event cannot double-post', () => {
      const store = useDmsStore();
      store.setMessages('conv1', [directMessage({ id: 'dm1' })]);
      store.appendMessage('conv1', directMessage({ id: 'dm1' }));
      expect(store.forConversation('conv1')).toHaveLength(1);
    });

    it('drops the message when the conversation was never loaded', () => {
      const store = useDmsStore();
      store.appendMessage('conv1', directMessage({ id: 'dm1' }));
      expect(store.forConversation('conv1')).toEqual([]);
    });
  });

  describe('bumpConversation', () => {
    it('moves the last message forward and raises the unread counter', () => {
      const store = useDmsStore();
      store.setConversations([conversation({ id: 'conv1' })]);
      const msg = directMessage({ createdAt: '2026-07-19T13:00:00.000Z' });
      store.bumpConversation(msg, { incrementUnread: true });
      expect(store.conversations[0]!.lastMessageAt).toBe('2026-07-19T13:00:00.000Z');
      expect(store.conversations[0]!.lastMessage).toEqual(msg);
      expect(store.conversations[0]!.unreadCount).toBe(1);
    });

    it('leaves the counter alone when the conversation is already read', () => {
      const store = useDmsStore();
      store.setConversations([conversation({ id: 'conv1' })]);
      store.bumpConversation(directMessage(), { incrementUnread: false });
      expect(store.conversations[0]!.unreadCount).toBe(0);
    });

    it('ignores a message for an unknown conversation', () => {
      const store = useDmsStore();
      store.bumpConversation(directMessage({ conversationId: 'ghost' }), { incrementUnread: true });
      expect(store.conversations).toEqual([]);
    });
  });

  describe('receiveDirectMessage', () => {
    it('flags an incoming message on an inactive conversation as notifiable', () => {
      const store = useDmsStore();
      store.setConversations([conversation({ id: 'conv1' })]);
      store.setMessages('conv1', []);
      const result = store.receiveDirectMessage(directMessage(), {
        isMine: false,
        isActive: false,
      });
      expect(result).toEqual({ isNew: false, shouldNotify: true });
      expect(store.conversations[0]!.unreadCount).toBe(1);
    });

    it('never notifies for a message the user just sent', () => {
      const store = useDmsStore();
      store.setConversations([conversation({ id: 'conv1' })]);
      store.setMessages('conv1', []);
      const result = store.receiveDirectMessage(directMessage(), { isMine: true, isActive: false });
      expect(result.shouldNotify).toBe(false);
      expect(store.conversations[0]!.unreadCount).toBe(0);
    });

    it('does not notify while the conversation is on screen', () => {
      const store = useDmsStore();
      store.setConversations([conversation({ id: 'conv1' })]);
      store.setMessages('conv1', []);
      expect(
        store.receiveDirectMessage(directMessage(), { isMine: false, isActive: true }).shouldNotify,
      ).toBe(false);
    });

    it('reports an unknown conversation as new so the caller can refetch it', () => {
      const store = useDmsStore();
      const result = store.receiveDirectMessage(directMessage({ conversationId: 'ghost' }), {
        isMine: false,
        isActive: false,
      });
      expect(result.isNew).toBe(true);
    });
  });

  describe('markReadLocal', () => {
    it('clears the unread counter of the conversation', () => {
      const store = useDmsStore();
      store.setConversations([conversation({ id: 'conv1', unreadCount: 4 })]);
      store.markReadLocal('conv1');
      expect(store.conversations[0]!.unreadCount).toBe(0);
    });

    it('is a no-op for an unknown conversation', () => {
      const store = useDmsStore();
      store.setConversations([conversation({ id: 'conv1', unreadCount: 4 })]);
      store.markReadLocal('ghost');
      expect(store.conversations[0]!.unreadCount).toBe(4);
    });
  });
});
