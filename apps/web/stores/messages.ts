import { defineStore } from 'pinia';
import type { MessagePublic } from '@nookapp/protocol';

interface MessagesState {
  byChannel: Record<string, MessagePublic[]>;
  loadingChannels: Record<string, boolean>;
  counts: Record<string, number>;
  unread: Record<string, number>;
}

export const useMessagesStore = defineStore('messages', {
  state: (): MessagesState => ({
    byChannel: {},
    loadingChannels: {},
    counts: {},
    unread: {},
  }),
  getters: {
    forChannel: (s) => (channelId: string) => s.byChannel[channelId] ?? [],
    countFor: (s) => (channelId: string) => s.counts[channelId] ?? 0,
  },
  actions: {
    setMessages(channelId: string, messages: MessagePublic[]) {
      this.byChannel[channelId] = messages;
    },
    appendMessage(channelId: string, message: MessagePublic) {
      if (!this.byChannel[channelId]) this.byChannel[channelId] = [];
      this.byChannel[channelId].push(message);
    },
    // Per-channel unread counter, driven by realtime messages arriving in a
    // channel that isn't currently open. Reset when the channel is read.
    bumpUnread(channelId: string) {
      this.unread[channelId] = (this.unread[channelId] ?? 0) + 1;
    },
    clearUnread(channelId: string) {
      this.unread[channelId] = 0;
    },
    updateMessage(channelId: string, message: MessagePublic) {
      const list = this.byChannel[channelId];
      if (!list) return;
      const idx = list.findIndex((m) => m.id === message.id);
      if (idx !== -1) list[idx] = message;
    },
    removeMessage(channelId: string, messageId: string) {
      const list = this.byChannel[channelId];
      if (!list) return;
      this.byChannel[channelId] = list.filter((m) => m.id !== messageId);
      if (this.counts[channelId]) this.counts[channelId] -= 1;
    },
    setLoading(channelId: string, loading: boolean) {
      this.loadingChannels[channelId] = loading;
    },
    isLoading(channelId: string) {
      return !!this.loadingChannels[channelId];
    },
    setCounts(counts: Record<string, number>) {
      this.counts = { ...counts };
    },
    incrementCount(channelId: string) {
      this.counts[channelId] = (this.counts[channelId] ?? 0) + 1;
    },
  },
});
