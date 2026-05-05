import { defineStore } from 'pinia';
import type { CategoryPublic, ChannelPublic, ServerPublic } from '@nookapp/protocol';

interface ServersState {
  list: ServerPublic[];
  current: ServerPublic | null;
  channels: ChannelPublic[];
  categories: CategoryPublic[];
  ready: boolean;
}

export const useServersStore = defineStore('servers', {
  state: (): ServersState => ({
    list: [],
    current: null,
    channels: [],
    categories: [],
    ready: false,
  }),
  getters: {
    textChannels: (s) => s.channels.filter((c) => c.type === 'text' && !c.parentId),
    voiceChannels: (s) => s.channels.filter((c) => c.type === 'voice' && !c.parentId),
    forumChannels: (s) => s.channels.filter((c) => c.type === 'forum' && !c.parentId),
    gameChannels: (s) => s.channels.filter((c) => c.type === 'game' && !c.parentId),
    postChannels: (s) => (parentId: string) => s.channels.filter((c) => c.parentId === parentId),
  },
  actions: {
    setList(servers: ServerPublic[]) {
      this.list = servers;
      this.ready = true;
    },
    setCurrent(server: ServerPublic | null) {
      this.current = server;
      if (!server) {
        this.channels = [];
        this.categories = [];
      }
    },
    setChannels(channels: ChannelPublic[]) {
      this.channels = channels;
    },
    setCategories(categories: CategoryPublic[]) {
      this.categories = categories;
    },
    upsertCategory(category: CategoryPublic) {
      const idx = this.categories.findIndex((c) => c.id === category.id);
      if (idx >= 0) this.categories[idx] = category;
      else this.categories.push(category);
    },
    removeCategory(categoryId: string) {
      this.categories = this.categories.filter((c) => c.id !== categoryId);
    },
    upsertServer(server: ServerPublic) {
      const idx = this.list.findIndex((s) => s.id === server.id);
      if (idx >= 0) this.list[idx] = server;
      else this.list.push(server);
    },
    removeServer(serverId: string) {
      this.list = this.list.filter((s) => s.id !== serverId);
      if (this.current?.id === serverId) this.current = null;
    },
  },
});
