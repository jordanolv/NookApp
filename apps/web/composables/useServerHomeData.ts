import { computed, type Ref } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import { useMessagesStore } from '~/stores/messages';
import { useHomePins } from '~/composables/useHomePins';

export function useServerHomeData(serverId: Ref<string>) {
  const { store } = useServers();
  const { user } = useAuth();
  const voice = useVoice();
  const messagesStore = useMessagesStore();
  const homePins = useHomePins(serverId);
  const { resolveUrl } = useResolveUrl();

  const bannerUrl = computed(() => resolveUrl(store.current?.bannerUrl) ?? null);
  const iconUrl = computed(() => resolveUrl(store.current?.iconUrl) ?? null);

  const onlineCount = computed(() =>
    Array.from(voice.voicePresence.value.values()).reduce((sum, list) => sum + list.length, 0),
  );

  const allChannels = computed(() => store.channels.filter((c) => c.serverId === serverId.value));

  const textChannels = computed(() =>
    allChannels.value
      .filter((c) => c.type === 'text' && !c.parentId)
      .sort(
        (a, b) =>
          (messagesStore.countFor(b.id) ?? 0) - (messagesStore.countFor(a.id) ?? 0) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 5),
  );

  const voiceChannels = computed(() =>
    allChannels.value.filter((c) => c.type === 'voice' && !c.parentId),
  );

  const liveVoiceChannels = computed(() =>
    voiceChannels.value
      .map((c) => ({ ch: c, members: voice.voicePresence.value.get(c.id) ?? [] }))
      .sort((a, b) => b.members.length - a.members.length),
  );

  const forumChannels = computed(() =>
    allChannels.value.filter((c) => c.type === 'forum' && !c.parentId),
  );

  const pinnedChannels = computed<ChannelPublic[]>(() => {
    const ids = homePins.pins.value.filter((p) => p.kind === 'channel').map((p) => p.channelId);
    const byId = new Map(allChannels.value.map((c) => [c.id, c]));
    return ids.map((id) => byId.get(id)).filter((c): c is ChannelPublic => !!c);
  });

  function forumThreadCount(channelId: string): number {
    return allChannels.value.filter((c) => c.parentId === channelId).length;
  }

  function lastSnippet(channelId: string): string | null {
    const msgs = messagesStore.forChannel(channelId);
    const last = msgs[msgs.length - 1];
    if (!last) return null;
    const author = last.authorId === user.value?.id ? 'toi' : last.authorId.slice(0, 6);
    const text = last.content.replace(/\s+/g, ' ').slice(0, 64);
    return `${author}: ${text}${last.content.length > 64 ? '…' : ''}`;
  }

  function messageCount(channelId: string): number {
    return messagesStore.countFor(channelId) ?? 0;
  }

  return {
    store,
    bannerUrl,
    iconUrl,
    onlineCount,
    allChannels,
    textChannels,
    voiceChannels,
    liveVoiceChannels,
    forumChannels,
    pinnedChannels,
    forumThreadCount,
    lastSnippet,
    messageCount,
  };
}
