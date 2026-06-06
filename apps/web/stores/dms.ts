import { defineStore } from 'pinia';
import type { DirectMessagePublic, DmConversation, DmUser } from '@nookapp/protocol';

interface DmsState {
  conversations: DmConversation[];
  byConversation: Record<string, DirectMessagePublic[]>;
  loading: Record<string, boolean>;
  candidates: DmUser[];
}

export const useDmsStore = defineStore('dms', {
  state: (): DmsState => ({
    conversations: [],
    byConversation: {},
    loading: {},
    candidates: [],
  }),
  getters: {
    sortedConversations: (s) =>
      [...s.conversations].sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1)),
    totalUnread: (s) => s.conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    forConversation: (s) => (conversationId: string) => s.byConversation[conversationId] ?? [],
    isLoading: (s) => (conversationId: string) => !!s.loading[conversationId],
  },
  actions: {
    setConversations(conversations: DmConversation[]) {
      this.conversations = conversations;
    },
    upsertConversation(conversation: DmConversation) {
      const i = this.conversations.findIndex((c) => c.id === conversation.id);
      if (i === -1) this.conversations.push(conversation);
      else this.conversations[i] = conversation;
    },
    setCandidates(candidates: DmUser[]) {
      this.candidates = candidates;
    },
    setMessages(conversationId: string, messages: DirectMessagePublic[]) {
      this.byConversation[conversationId] = messages;
    },
    appendMessage(conversationId: string, message: DirectMessagePublic) {
      const list = this.byConversation[conversationId];
      if (!list) return;
      if (list.some((m) => m.id === message.id)) return;
      list.push(message);
    },
    setLoading(conversationId: string, loading: boolean) {
      this.loading[conversationId] = loading;
    },
    bumpConversation(message: DirectMessagePublic, opts: { incrementUnread: boolean }) {
      const conv = this.conversations.find((c) => c.id === message.conversationId);
      if (!conv) return;
      conv.lastMessage = message;
      conv.lastMessageAt = message.createdAt;
      if (opts.incrementUnread) conv.unreadCount += 1;
    },
    receiveDirectMessage(
      message: DirectMessagePublic,
      ctx: { isMine: boolean; isActive: boolean },
    ): { isNew: boolean; shouldNotify: boolean } {
      const isNew = !this.conversations.some((c) => c.id === message.conversationId);
      const unread = !ctx.isMine && !ctx.isActive;
      this.appendMessage(message.conversationId, message);
      this.bumpConversation(message, { incrementUnread: unread });
      return { isNew, shouldNotify: unread };
    },
    markReadLocal(conversationId: string) {
      const conv = this.conversations.find((c) => c.id === conversationId);
      if (conv) conv.unreadCount = 0;
    },
  },
});
