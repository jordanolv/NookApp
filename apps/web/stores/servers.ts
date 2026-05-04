import { defineStore } from 'pinia';
import type { ChannelPublic, ServerPublic } from '@nookapp/protocol';

interface ServersState {
  list: ServerPublic[];
  current: ServerPublic | null;
  channels: ChannelPublic[];
  ready: boolean;
}

export const useServersStore = defineStore('servers', {
  state: (): ServersState => ({
    list: [],
    current: null,
    channels: [],
    ready: false,
  }),
  getters: {
    textChannels: (s) => s.channels.filter((c) => c.type === 'text'),
    voiceChannels: (s) => s.channels.filter((c) => c.type === 'voice'),
    forumChannels: (s) => s.channels.filter((c) => c.type === 'forum'),
    gameChannels: (s) => s.channels.filter((c) => c.type === 'game'),
    postChannels: (s) => (parentId: string) => s.channels.filter((c) => c.parentId === parentId),
  },
  actions: {
    setList(servers: ServerPublic[]) {
      this.list = servers;
      this.ready = true;
    },
    setCurrent(server: ServerPublic | null) {
      this.current = server;
      if (!server) this.channels = [];
    },
    setChannels(channels: ChannelPublic[]) {
      this.channels = channels;
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
