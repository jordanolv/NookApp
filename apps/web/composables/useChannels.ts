import type { ChannelPublic, CreateChannelInput } from '@nookapp/protocol';
import { useServersStore } from '~/stores/servers';

export function useChannels() {
  const api = useApi();
  const store = useServersStore();

  async function fetchChannels(serverId: string) {
    const channels = await api.get<ChannelPublic[]>(`/servers/${serverId}/channels`);
    store.setChannels(channels);
    return channels;
  }

  async function createChannel(
    serverId: string,
    input: CreateChannelInput,
  ): Promise<ChannelPublic> {
    const channel = await api.post<ChannelPublic>(`/servers/${serverId}/channels`, input);
    store.setChannels([...store.channels, channel]);
    return channel;
  }

  return { store, fetchChannels, createChannel };
}
