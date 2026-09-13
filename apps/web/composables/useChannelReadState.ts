import type { ChannelUnread, MessagePublic, ServerUnread } from '@nookapp/protocol';
import { useAuthStore } from '~/stores/auth';

const EMPTY: ChannelUnread = { messages: 0, mentions: 0 };
const FLUSH_DELAY = 1000;

// One pending write per channel: an open channel marks itself read on every
// incoming message, and none of those need their own round trip.
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Unread and mention counters, counted server-side from `channel_read.last_read_at`
 * so they survive a disconnect instead of being rebuilt from the loaded messages.
 */
export function useChannelReadState() {
  const api = useApi();
  const unread = useState<ServerUnread>('channels:unread', () => ({}));
  const currentServerId = useState<string | null>('channels:unread:server', () => null);
  // Channels whose ChatPane is mounted: their messages are read as they arrive.
  const viewing = useState<Set<string>>('channels:viewing', () => new Set());

  async function loadUnread(serverId: string): Promise<void> {
    currentServerId.value = serverId;
    try {
      unread.value = await api.get<ServerUnread>(`/servers/${serverId}/unread`);
    } catch {
      unread.value = {};
    }
  }

  function patchChannel(channelId: string, value: ChannelUnread | null): void {
    const next = { ...unread.value };
    if (value) next[channelId] = value;
    else delete next[channelId];
    unread.value = next;
  }

  function markRead(channelId: string): void {
    const serverId = currentServerId.value;
    if (unread.value[channelId]) patchChannel(channelId, null);
    if (!serverId) return;
    clearTimeout(pendingWrites.get(channelId));
    pendingWrites.set(
      channelId,
      setTimeout(() => {
        pendingWrites.delete(channelId);
        void api.put(`/servers/${serverId}/channels/${channelId}/read`, {}).catch(() => {
          // best-effort — the next loadUnread resyncs from the server anyway
        });
      }, FLUSH_DELAY),
    );
  }

  /** Counts a message that just arrived over the socket. */
  function noteIncoming(msg: MessagePublic): void {
    const meId = useAuthStore().user?.id;
    if (!meId || msg.authorId === meId) return;
    if (viewing.value.has(msg.channelId)) return;
    const prev = unread.value[msg.channelId] ?? EMPTY;
    patchChannel(msg.channelId, {
      messages: prev.messages + 1,
      mentions: prev.mentions + (msg.mentions.includes(meId) ? 1 : 0),
    });
  }

  function countOf(channelId: string): ChannelUnread {
    return unread.value[channelId] ?? EMPTY;
  }

  function unreadCount(channelId: string): number {
    return countOf(channelId).messages;
  }

  function mentionCount(channelId: string): number {
    return countOf(channelId).mentions;
  }

  function isUnread(channelId: string): boolean {
    return unreadCount(channelId) > 0;
  }

  function setViewing(channelId: string, on: boolean): void {
    const next = new Set(viewing.value);
    if (on) next.add(channelId);
    else next.delete(channelId);
    viewing.value = next;
  }

  function isViewing(channelId: string): boolean {
    return viewing.value.has(channelId);
  }

  return {
    unread,
    loadUnread,
    markRead,
    noteIncoming,
    countOf,
    unreadCount,
    mentionCount,
    isUnread,
    setViewing,
    isViewing,
  };
}
