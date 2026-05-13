import { defineStore } from 'pinia';
import type { MessagePublic } from '@nookapp/protocol';

interface MessagesState {
  byChannel: Record<string, MessagePublic[]>;
  loadingChannels: Record<string, boolean>;
  counts: Record<string, number>;
}

export const useMessagesStore = defineStore('messages', {
  state: (): MessagesState => ({
    byChannel: {},
    loadingChannels: {},
    counts: {},
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
