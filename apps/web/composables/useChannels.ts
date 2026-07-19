import type { ChannelPublic, CreateChannelInput, UpdateChannelInput } from '@nookapp/protocol';
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
    const channel = await api.post<ChannelPublic>(
      `/servers/${serverId}/channels`,
      input as Record<string, unknown>,
    );
    store.setChannels([...store.channels, channel]);
    return channel;
  }

  async function updateChannel(
    serverId: string,
    channelId: string,
    input: UpdateChannelInput,
  ): Promise<ChannelPublic> {
    const updated = await api.patch<ChannelPublic>(
      `/servers/${serverId}/channels/${channelId}`,
      input as Record<string, unknown>,
    );
    store.setChannels(store.channels.map((c) => (c.id === channelId ? updated : c)));
    return updated;
  }

  async function deleteChannel(serverId: string, channelId: string): Promise<void> {
    await api.del(`/servers/${serverId}/channels/${channelId}`);
    store.setChannels(store.channels.filter((c) => c.id !== channelId));
  }

  async function setChannelIcon(
    serverId: string,
    channelId: string,
    file: File,
  ): Promise<ChannelPublic> {
    const form = new FormData();
    form.append('file', file);
    const updated = await api.postForm<ChannelPublic>(
      `/servers/${serverId}/channels/${channelId}/icon`,
      form,
    );
    store.setChannels(store.channels.map((c) => (c.id === channelId ? updated : c)));
    return updated;
  }

  async function setChannelBanner(
    serverId: string,
    channelId: string,
    file: File,
  ): Promise<ChannelPublic> {
    const form = new FormData();
    form.append('file', file);
    const updated = await api.postForm<ChannelPublic>(
      `/servers/${serverId}/channels/${channelId}/banner`,
      form,
    );
    store.setChannels(store.channels.map((c) => (c.id === channelId ? updated : c)));
    return updated;
  }

  return {
    store,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    setChannelIcon,
    setChannelBanner,
  };
}
