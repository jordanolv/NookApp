import type {
  CreateDirectMessageInput,
  DirectMessagePublic,
  DmConversation,
  DmUser,
} from '@nookapp/protocol';
import { useDmsStore } from '~/stores/dms';

export function useDms() {
  const api = useApi();
  const store = useDmsStore();

  async function fetchConversations() {
    const list = await api.get<DmConversation[]>('/dms');
    store.setConversations(list);
    return list;
  }

  async function fetchCandidates() {
    const list = await api.get<DmUser[]>('/dms/candidates');
    store.setCandidates(list);
    return list;
  }

  async function lookupUser(username: string): Promise<DmUser | null> {
    const handle = username.trim().replace(/^@/, '');
    if (!handle) return null;
    try {
      return await api.get<DmUser>('/dms/lookup', { query: { username: handle } });
    } catch {
      return null;
    }
  }

  async function openConversation(recipientId: string) {
    const conv = await api.post<DmConversation>('/dms', { recipientId });
    store.upsertConversation(conv);
    return conv;
  }

  async function fetchMessages(conversationId: string) {
    if (store.byConversation[conversationId]) return store.byConversation[conversationId];
    store.setLoading(conversationId, true);
    try {
      const messages = await api.get<DirectMessagePublic[]>(`/dms/${conversationId}/messages`);
      store.setMessages(conversationId, messages);
      return messages;
    } finally {
      store.setLoading(conversationId, false);
    }
  }

  async function sendMessage(conversationId: string, input: CreateDirectMessageInput) {
    return api.post<DirectMessagePublic>(
      `/dms/${conversationId}/messages`,
      input as unknown as Record<string, unknown>,
    );
  }

  async function markRead(conversationId: string) {
    store.markReadLocal(conversationId);
    try {
      await api.post(`/dms/${conversationId}/read`, {});
    } catch {
      /* best-effort */
    }
  }

  return {
    store,
    fetchConversations,
    fetchCandidates,
    lookupUser,
    openConversation,
    fetchMessages,
    sendMessage,
    markRead,
  };
}
