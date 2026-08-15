import type { UiLayoutEntry } from '@nookapp/protocol';
import { useAuthStore } from '~/stores/auth';

const STORAGE_KEY = 'channels:lastSeen';

type LastSeenMap = Record<string, string>;

export function useChannelReadState() {
  const uiLayout = useUiLayout();
  const lastSeen = useState<LastSeenMap>('channels:lastSeen', () => ({}));
  const loaded = useState<boolean>('channels:lastSeen:loaded', () => false);

  if (!loaded.value) {
    loaded.value = true;
    void uiLayout.ensureLoaded().then(() => {
      const saved = uiLayout.get<UiLayoutEntry>(STORAGE_KEY);
      if (saved && typeof saved === 'object') {
        const next: LastSeenMap = {};
        for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
          if (typeof v === 'string') next[k] = v;
        }
        lastSeen.value = next;
      }
    });
  }

  function persist() {
    uiLayout.set(STORAGE_KEY, lastSeen.value as unknown as UiLayoutEntry);
  }

  function markRead(channelId: string) {
    lastSeen.value = { ...lastSeen.value, [channelId]: new Date().toISOString() };
    persist();
  }

  function isUnread(channelId: string, lastMessageCreatedAt?: string | null): boolean {
    if (!lastMessageCreatedAt) return false;
    const seen = lastSeen.value[channelId];
    if (!seen) return true;
    return new Date(lastMessageCreatedAt).getTime() > new Date(seen).getTime();
  }

  function unreadCount(channelId: string, lastMessageCreatedAt?: string | null): number {
    const messagesStore = useMessagesStore();
    const authStore = useAuthStore();
    const meId = authStore.user?.id;
    const list = messagesStore.byChannel[channelId];
    const seen = lastSeen.value[channelId];
    const seenMs = seen ? new Date(seen).getTime() : 0;
    if (list && list.length) {
      let n = 0;
      for (const m of list) {
        if (m.authorId === meId) continue;
        if (new Date(m.createdAt).getTime() > seenMs) n += 1;
      }
      return n;
    }
    return isUnread(channelId, lastMessageCreatedAt ?? messagesStore.lastMessageAt[channelId])
      ? 1
      : 0;
  }

  return { lastSeen, markRead, isUnread, unreadCount };
}
