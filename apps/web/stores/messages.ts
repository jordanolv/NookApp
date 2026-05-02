import { defineStore } from 'pinia';
import type { MessagePublic } from '@nookapp/protocol';

interface MessagesState {
  byChannel: Record<string, MessagePublic[]>;
  loadingChannels: Set<string>;
}

export const useMessagesStore = defineStore('messages', {
  state: (): MessagesState => ({
    byChannel: {},
    loadingChannels: new Set(),
  }),
  getters: {
    forChannel: (s) => (channelId: string) => s.byChannel[channelId] ?? [],
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
      if (loading) this.loadingChannels.add(channelId);
      else this.loadingChannels.delete(channelId);
    },
    isLoading(channelId: string) {
      return this.loadingChannels.has(channelId);
    },
  },
});
