import { defineStore } from 'pinia';
import type { MessagePublic } from '@nookapp/protocol';

interface MessagesState {
  byChannel: Record<string, MessagePublic[]>;
  loadingChannels: Record<string, boolean>;
}

export const useMessagesStore = defineStore('messages', {
  state: (): MessagesState => ({
    byChannel: {},
    loadingChannels: {},
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
      this.loadingChannels[channelId] = loading;
    },
    isLoading(channelId: string) {
      return !!this.loadingChannels[channelId];
    },
  },
});
