import type { CreateMessageInput, MessagePublic, UpdateMessageInput } from '@nookapp/protocol';
import { useMessagesStore } from '~/stores/messages';

export function useMessages() {
  const api = useApi();
  const store = useMessagesStore();

  async function fetchMessages(serverId: string, channelId: string) {
    if (store.byChannel[channelId]) return store.byChannel[channelId];
    store.setLoading(channelId, true);
    try {
      const messages = await api.get<MessagePublic[]>(
        `/servers/${serverId}/channels/${channelId}/messages`,
      );
      store.setMessages(channelId, messages);
      return messages;
    } finally {
      store.setLoading(channelId, false);
    }
  }

  async function fetchMessageCounts(serverId: string) {
    const counts = await api.get<Record<string, number>>(`/servers/${serverId}/message-counts`);
    store.setCounts(counts);
    return counts;
  }

  async function sendMessage(
    serverId: string,
    channelId: string,
    input: CreateMessageInput,
  ): Promise<MessagePublic> {
    return api.post<MessagePublic>(
      `/servers/${serverId}/channels/${channelId}/messages`,
      input as unknown as Record<string, unknown>,
    );
  }

  async function editMessage(
    serverId: string,
    channelId: string,
    messageId: string,
    input: UpdateMessageInput,
  ): Promise<MessagePublic> {
    return api.patch<MessagePublic>(
      `/servers/${serverId}/channels/${channelId}/messages/${messageId}`,
      input as unknown as Record<string, unknown>,
    );
  }

  async function deleteMessage(
    serverId: string,
    channelId: string,
    messageId: string,
  ): Promise<void> {
    await api.del(`/servers/${serverId}/channels/${channelId}/messages/${messageId}`);
  }

  return {
    store,
    fetchMessages,
    fetchMessageCounts,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
