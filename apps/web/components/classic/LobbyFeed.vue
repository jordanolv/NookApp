<script setup lang="ts">
import type { ChannelPublic } from '@nookapp/protocol';
import { useMessagesStore } from '~/stores/messages';

const props = defineProps<{
  serverId: string;
}>();

const emit = defineEmits<{
  'open-channel': [channelId: string];
  'open-forum': [channelId: string];
}>();

const { store } = useServers();
const messagesStore = useMessagesStore();
const { user } = useAuth();
const { t } = useI18n();

const textChannels = computed(() =>
  store.channels
    .filter((c) => c.serverId === props.serverId && c.type === 'text' && !c.parentId)
    .sort(
      (a, b) =>
        (messagesStore.countFor(b.id) ?? 0) - (messagesStore.countFor(a.id) ?? 0) ||
        a.name.localeCompare(b.name),
    ),
);

const forumRoots = computed(() =>
  store.channels.filter((c) => c.serverId === props.serverId && c.type === 'forum' && !c.parentId),
);

type ThreadRow = ChannelPublic & { forumName: string; messages: number };

const latestThreads = computed<ThreadRow[]>(() => {
  const forums = forumRoots.value;
  const rows: ThreadRow[] = [];
  for (const forum of forums) {
    const posts = store.channels.filter((c) => c.parentId === forum.id);
    for (const post of posts) {
      rows.push({
        ...post,
        forumName: forum.name,
        messages: messagesStore.countFor(post.id) ?? 0,
      });
    }
  }
  return rows
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
});

const recentMessageChannels = computed(() => textChannels.value.slice(0, 8));

function lastSnippet(channelId: string): string | null {
  const msgs = messagesStore.forChannel(channelId);
  const last = msgs[msgs.length - 1];
  if (!last) return null;
  const author =
    last.authorId === user.value?.id ? t('voice.members.you') : last.authorId.slice(0, 8);
  const content = last.content.replace(/\s+/g, ' ').slice(0, 90);
  return `${author}: ${content}${last.content.length > 90 ? '…' : ''}`;
}
</script>

<template>
  <div class="lobby-feed">
    <header class="lobby-feed__header">
      <h1 class="lobby-feed__title">
        <span class="lobby-feed__title-prompt">&gt;</span>
        {{ t('lobby.heading') }}_
      </h1>
      <p class="lobby-feed__subtitle">{{ t('lobby.subtitle') }}</p>
    </header>

    <section class="lobby-section">
      <h2 class="lobby-section__heading">
        <span class="lobby-section__bullet">[*]</span>
        {{ t('lobby.latestThreads') }}
      </h2>
      <div v-if="!latestThreads.length" class="lobby-empty">{{ t('lobby.noActivity') }}</div>
      <ul v-else class="lobby-list">
        <li
          v-for="thread in latestThreads"
          :key="thread.id"
          class="lobby-row"
          @click="emit('open-channel', thread.id)"
        >
          <span class="lobby-row__hash">#</span>
          <span class="lobby-row__name">{{ thread.name }}</span>
          <span class="lobby-row__meta">
            in <em>{{ thread.forumName }}</em>
          </span>
          <span class="lobby-row__count">{{
            t('lobby.messagesCount', { count: thread.messages }, thread.messages)
          }}</span>
          <span class="lobby-row__arrow">→</span>
        </li>
      </ul>
    </section>

    <section class="lobby-section">
      <h2 class="lobby-section__heading">
        <span class="lobby-section__bullet">[~]</span>
        {{ t('lobby.recentMessages') }}
      </h2>
      <div v-if="!recentMessageChannels.length" class="lobby-empty">
        {{ t('lobby.noActivity') }}
      </div>
      <ul v-else class="lobby-list">
        <li
          v-for="ch in recentMessageChannels"
          :key="ch.id"
          class="lobby-row lobby-row--stacked"
          @click="emit('open-channel', ch.id)"
        >
          <div class="lobby-row__line">
            <span class="lobby-row__hash">#</span>
            <span class="lobby-row__name">{{ ch.name }}</span>
            <span class="lobby-row__count">{{
              t(
                'lobby.messagesCount',
                { count: messagesStore.countFor(ch.id) ?? 0 },
                messagesStore.countFor(ch.id) ?? 0,
              )
            }}</span>
            <span class="lobby-row__arrow">→</span>
          </div>
          <p v-if="lastSnippet(ch.id)" class="lobby-row__snippet">{{ lastSnippet(ch.id) }}</p>
          <p v-else class="lobby-row__snippet lobby-row__snippet--muted">
            {{ t('lobby.noMessages') }}
          </p>
        </li>
      </ul>
    </section>

    <section v-if="forumRoots.length" class="lobby-section">
      <h2 class="lobby-section__heading">
        <span class="lobby-section__bullet">[#]</span>
        {{ t('lobby.forumHighlights') }}
      </h2>
      <ul class="lobby-list">
        <li
          v-for="forum in forumRoots"
          :key="forum.id"
          class="lobby-row"
          @click="emit('open-forum', forum.id)"
        >
          <span class="lobby-row__hash">::</span>
          <span class="lobby-row__name">{{ forum.name }}</span>
          <span class="lobby-row__count">{{
            t(
              'lobby.postsCount',
              { count: store.channels.filter((c) => c.parentId === forum.id).length },
              store.channels.filter((c) => c.parentId === forum.id).length,
            )
          }}</span>
          <span class="lobby-row__arrow">→</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.lobby-feed {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 32px 36px 64px;
  height: 100%;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.8);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.lobby-feed__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 16px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
}

.lobby-feed__title {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.lobby-feed__title-prompt {
  color: rgb(129, 140, 248);
  margin-right: 6px;
}

.lobby-feed__subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.lobby-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lobby-section__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.lobby-section__bullet {
  color: rgb(129, 140, 248);
  font-weight: 700;
}

.lobby-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lobby-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition:
    background 120ms,
    border-color 120ms,
    transform 120ms;
}

.lobby-row:hover {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(129, 140, 248, 0.3);
}

.lobby-row:hover .lobby-row__arrow {
  transform: translateX(2px);
  color: rgb(165, 180, 252);
}

.lobby-row--stacked {
  align-items: flex-start;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
}

.lobby-row__line {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.lobby-row__hash {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.lobby-row__name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  flex: 0 1 auto;
}

.lobby-row__meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  flex: 1;
}

.lobby-row__meta em {
  color: rgba(255, 255, 255, 0.6);
  font-style: normal;
  font-weight: 500;
}

.lobby-row__count {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: auto;
}

.lobby-row__arrow {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  color: rgba(255, 255, 255, 0.35);
  transition:
    transform 120ms,
    color 120ms;
}

.lobby-row__snippet {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  padding-left: 22px;
  line-height: 1.4;
}

.lobby-row__snippet--muted {
  color: rgba(255, 255, 255, 0.25);
  font-style: italic;
}

.lobby-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  padding: 12px;
  font-style: italic;
}
</style>
