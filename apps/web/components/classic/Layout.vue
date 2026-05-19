<script setup lang="ts">
import type { ChannelPublic } from '@nookapp/protocol';
import { Hash, MessageSquare, Volume2, Layers, Settings } from 'lucide-vue-next';
import { useMessagesStore } from '~/stores/messages';

const props = defineProps<{
  serverId: string;
}>();

const { store } = useServers();
const voice = useVoice();
const { user } = useAuth();
const { t } = useI18n();
const messagesStore = useMessagesStore();

const selectedChannelId = ref<string | null>(null);
const openForumId = ref<string | null>(null);
const showUserSettings = ref(false);

const channels = computed(() =>
  store.channels.filter((c) => c.serverId === props.serverId && !c.parentId),
);

const channelById = computed(() => {
  const map = new Map<string, ChannelPublic>();
  for (const c of store.channels) map.set(c.id, c);
  return map;
});

const groupedChannels = computed(() => ({
  text: channels.value.filter((c) => c.type === 'text'),
  forum: channels.value.filter((c) => c.type === 'forum'),
  voice: channels.value.filter((c) => c.type === 'voice'),
}));

const selectedChannel = computed(() =>
  selectedChannelId.value ? (channelById.value.get(selectedChannelId.value) ?? null) : null,
);

const forumPosts = computed(() => {
  if (!openForumId.value) return [];
  return store.channels
    .filter((c) => c.parentId === openForumId.value)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

function postReplies(postId: string): number {
  return messagesStore.countFor(postId) ?? 0;
}

function postCreatedLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const openForum = computed(() =>
  openForumId.value ? (channelById.value.get(openForumId.value) ?? null) : null,
);

async function onSelectChannel(ch: ChannelPublic) {
  if (ch.type === 'voice') {
    if (voice.currentChannelId.value === ch.id) await voice.leave();
    else await voice.join(props.serverId, ch.id);
    return;
  }
  if (ch.type === 'forum') {
    openForumId.value = ch.id;
    selectedChannelId.value = null;
    return;
  }
  openForumId.value = null;
  selectedChannelId.value = ch.id;
}

function onOpenChannelFromFeed(channelId: string) {
  openForumId.value = null;
  selectedChannelId.value = channelId;
}

function onOpenForumFromFeed(channelId: string) {
  selectedChannelId.value = null;
  openForumId.value = channelId;
}

function backToLobby() {
  selectedChannelId.value = null;
  openForumId.value = null;
}

function isActive(ch: ChannelPublic): boolean {
  if (ch.type === 'voice') return voice.currentChannelId.value === ch.id;
  if (ch.type === 'forum') return openForumId.value === ch.id;
  return selectedChannelId.value === ch.id;
}
</script>

<template>
  <div class="classic-layout">
    <!-- Left: channels nav -->
    <nav class="classic-nav">
      <div class="classic-nav__brand">
        <span class="classic-nav__brand-prompt">::</span>
        <span class="classic-nav__brand-name">{{ store.current?.name ?? '—' }}</span>
      </div>

      <button
        class="classic-nav__home"
        :class="{ 'classic-nav__home--active': !selectedChannelId && !openForumId }"
        @click="backToLobby"
      >
        <Layers :size="14" :stroke-width="1.75" />
        <span>{{ t('lobby.heading') }}</span>
      </button>

      <section v-if="groupedChannels.text.length" class="classic-nav__group">
        <h3 class="classic-nav__group-title">
          <Hash :size="11" :stroke-width="2" />
          <span>Text</span>
        </h3>
        <button
          v-for="ch in groupedChannels.text"
          :key="ch.id"
          class="classic-nav__row"
          :class="{ 'classic-nav__row--active': isActive(ch) }"
          @click="onSelectChannel(ch)"
        >
          <span class="classic-nav__row-hash">#</span>
          <span class="classic-nav__row-name">{{ ch.name }}</span>
        </button>
      </section>

      <section v-if="groupedChannels.forum.length" class="classic-nav__group">
        <h3 class="classic-nav__group-title">
          <MessageSquare :size="11" :stroke-width="2" />
          <span>Forums</span>
        </h3>
        <button
          v-for="ch in groupedChannels.forum"
          :key="ch.id"
          class="classic-nav__row"
          :class="{ 'classic-nav__row--active': isActive(ch) }"
          @click="onSelectChannel(ch)"
        >
          <span class="classic-nav__row-hash">::</span>
          <span class="classic-nav__row-name">{{ ch.name }}</span>
        </button>
      </section>

      <section v-if="groupedChannels.voice.length" class="classic-nav__group">
        <h3 class="classic-nav__group-title">
          <Volume2 :size="11" :stroke-width="2" />
          <span>Voice</span>
        </h3>
        <button
          v-for="ch in groupedChannels.voice"
          :key="ch.id"
          class="classic-nav__row"
          :class="{ 'classic-nav__row--voice-active': isActive(ch) }"
          @click="onSelectChannel(ch)"
        >
          <span class="classic-nav__row-hash">»</span>
          <span class="classic-nav__row-name">{{ ch.name }}</span>
          <span v-if="isActive(ch)" class="classic-nav__row-live" :title="t('voice.connected')" />
        </button>
      </section>

      <div class="classic-nav__user">
        <div class="classic-nav__user-avatar">{{ user?.name?.[0]?.toUpperCase() ?? '?' }}</div>
        <div class="classic-nav__user-meta">
          <p class="classic-nav__user-name">{{ user?.name ?? '—' }}</p>
          <p class="classic-nav__user-status">
            {{ voice.currentChannelId.value ? t('voice.connected') : t('voice.status.inNook') }}
          </p>
        </div>
        <button
          class="classic-nav__user-settings"
          :title="t('voice.accountSettings')"
          @click="showUserSettings = true"
        >
          <Settings :size="14" :stroke-width="1.75" />
        </button>
      </div>
    </nav>

    <!-- Center: lobby or active channel -->
    <main class="classic-main">
      <nav v-if="selectedChannel || openForum" class="classic-breadcrumb" aria-label="Breadcrumb">
        <button
          class="classic-breadcrumb__crumb classic-breadcrumb__crumb--link"
          @click="backToLobby"
        >
          <Layers :size="11" :stroke-width="2" />
          <span>{{ store.current?.name ?? 'Board' }}</span>
        </button>
        <span class="classic-breadcrumb__sep">›</span>
        <template v-if="selectedChannel && selectedChannel.parentId">
          <button
            class="classic-breadcrumb__crumb classic-breadcrumb__crumb--link"
            @click="onOpenForumFromFeed(selectedChannel.parentId!)"
          >
            <span class="classic-breadcrumb__hash">::</span>
            <span>{{ channelById.get(selectedChannel.parentId!)?.name ?? '…' }}</span>
          </button>
          <span class="classic-breadcrumb__sep">›</span>
          <span class="classic-breadcrumb__crumb classic-breadcrumb__crumb--current">
            <span class="classic-breadcrumb__hash">#</span>
            <span>{{ selectedChannel.name }}</span>
          </span>
        </template>
        <span v-else class="classic-breadcrumb__crumb classic-breadcrumb__crumb--current">
          <span class="classic-breadcrumb__hash">{{ openForum ? '::' : '#' }}</span>
          <span>{{ (selectedChannel ?? openForum)?.name }}</span>
        </span>
      </nav>

      <ChatPane
        v-if="selectedChannel && selectedChannel.type === 'text'"
        :key="selectedChannel.id"
        :channel-id="selectedChannel.id"
        class="classic-main__chat"
      />

      <div v-else-if="openForum" class="classic-forum">
        <header class="classic-forum__head">
          <div>
            <h2 class="classic-forum__title">{{ openForum.name }}</h2>
            <p class="classic-forum__desc">
              {{ forumPosts.length }}
              {{ forumPosts.length === 1 ? 'topic' : 'topics' }} in this board
            </p>
          </div>
          <span class="classic-forum__pager">Page <strong>1</strong> of 1</span>
        </header>

        <div v-if="!forumPosts.length" class="classic-forum__empty">
          {{ t('lobby.noActivity') }}
        </div>

        <div v-else class="classic-forum__table" role="table">
          <div class="classic-forum__row classic-forum__row--head" role="row">
            <div class="classic-forum__cell classic-forum__cell--name" role="columnheader">
              Topic
            </div>
            <div class="classic-forum__cell classic-forum__cell--num" role="columnheader">
              Replies
            </div>
            <div class="classic-forum__cell classic-forum__cell--date" role="columnheader">
              Started
            </div>
          </div>

          <div
            v-for="(post, i) in forumPosts"
            :key="post.id"
            class="classic-forum__row"
            :class="{ 'classic-forum__row--alt': i % 2 === 1 }"
            role="row"
            @click="onOpenChannelFromFeed(post.id)"
          >
            <div class="classic-forum__cell classic-forum__cell--name" role="cell">
              <span class="classic-forum__topic-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"
                  />
                </svg>
              </span>
              <div class="classic-forum__namecol">
                <span class="classic-forum__topic-name">{{ post.name }}</span>
                <span class="classic-forum__topic-meta">Thread #{{ post.id.slice(0, 6) }}</span>
              </div>
            </div>
            <div class="classic-forum__cell classic-forum__cell--num" role="cell">
              {{ postReplies(post.id) }}
            </div>
            <div class="classic-forum__cell classic-forum__cell--date" role="cell">
              {{ postCreatedLabel(post.createdAt) }}
            </div>
          </div>
        </div>
      </div>

      <ClassicLobbyFeed
        v-else
        :server-id="serverId"
        @open-channel="onOpenChannelFromFeed"
        @open-forum="onOpenForumFromFeed"
      />
    </main>

    <!-- Right: voice column -->
    <ClassicVoiceColumn />

    <UserSettingsModal v-if="showUserSettings" @close="showUserSettings = false" />
  </div>
</template>

<style scoped>
.classic-layout {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: 260px 1fr 340px;
  background:
    radial-gradient(circle at 20% 0%, rgba(99, 102, 241, 0.08), transparent 60%),
    radial-gradient(circle at 80% 100%, rgba(34, 197, 94, 0.05), transparent 55%), #07070b;
  color: rgba(255, 255, 255, 0.85);
}

@media (max-width: 1100px) {
  .classic-layout {
    grid-template-columns: 220px 1fr 280px;
  }
}

/* ── Left nav ────────────────────────────────────────── */
.classic-nav {
  display: flex;
  flex-direction: column;
  padding: 14px 10px 10px;
  background: rgba(10, 10, 16, 0.7);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

.classic-nav__brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 8px 16px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}

.classic-nav__brand-prompt {
  color: rgb(129, 140, 248);
  font-weight: 700;
}

.classic-nav__brand-name {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.classic-nav__home {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition:
    background 120ms,
    color 120ms;
}

.classic-nav__home:hover {
  background: rgba(99, 102, 241, 0.1);
  color: rgba(255, 255, 255, 0.95);
}

.classic-nav__home--active {
  background: rgba(99, 102, 241, 0.18);
  border-color: rgba(129, 140, 248, 0.4);
  color: rgb(199, 210, 254);
}

.classic-nav__group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 14px;
}

.classic-nav__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 4px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.classic-nav__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: left;
  transition:
    background 120ms,
    color 120ms;
}

.classic-nav__row:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.9);
}

.classic-nav__row--active {
  background: rgba(99, 102, 241, 0.18);
  color: rgb(199, 210, 254);
}

.classic-nav__row--voice-active {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(134, 239, 172);
}

.classic-nav__row-hash {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  width: 14px;
  text-align: center;
}

.classic-nav__row--active .classic-nav__row-hash,
.classic-nav__row--voice-active .classic-nav__row-hash {
  color: currentColor;
  opacity: 0.7;
}

.classic-nav__row-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.classic-nav__row-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
  animation: classic-live-pulse 1.6s ease-in-out infinite;
}

@keyframes classic-live-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.classic-nav__user {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: auto;
}

.classic-nav__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.classic-nav__user-meta {
  min-width: 0;
  flex: 1;
}

.classic-nav__user-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.classic-nav__user-status {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}

.classic-nav__user-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.4);
  transition:
    background 120ms,
    color 120ms;
}

.classic-nav__user-settings:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}

/* ── Center main ─────────────────────────────────────── */
.classic-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  font-family: 'Verdana', 'Geneva', 'Tahoma', sans-serif;
}

.classic-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background:
    linear-gradient(180deg, rgba(99, 102, 241, 0.16), rgba(99, 102, 241, 0.04)),
    rgba(15, 16, 24, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  flex-wrap: wrap;
}

.classic-breadcrumb__crumb {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.65);
  background: transparent;
  font-weight: 500;
}

.classic-breadcrumb__crumb--link {
  color: rgb(165, 180, 252);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(165, 180, 252, 0.35);
  text-underline-offset: 2px;
  transition:
    background 120ms,
    color 120ms;
}

.classic-breadcrumb__crumb--link:hover {
  background: rgba(99, 102, 241, 0.18);
  color: rgb(199, 210, 254);
  text-decoration-color: rgb(199, 210, 254);
}

.classic-breadcrumb__crumb--current {
  color: rgba(255, 255, 255, 0.92);
  font-weight: 700;
}

.classic-breadcrumb__hash {
  font-family: ui-monospace, 'Lucida Console', monospace;
  color: rgba(255, 255, 255, 0.45);
}

.classic-breadcrumb__sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

.classic-main__chat {
  flex: 1;
  min-height: 0;
}

.classic-forum {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 22px 28px 48px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

.classic-forum__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  margin-bottom: 0;
  background:
    linear-gradient(180deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
    rgba(20, 22, 32, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
}

.classic-forum__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
}

.classic-forum__desc {
  margin: 2px 0 0;
  font-size: 11px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.45);
}

.classic-forum__pager {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  font-family: ui-monospace, 'Lucida Console', monospace;
}

.classic-forum__pager strong {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 700;
}

.classic-forum__table {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0 0 4px 4px;
  background: rgba(15, 16, 24, 0.55);
  overflow: hidden;
}

.classic-forum__row {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 90px 140px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 100ms;
}

.classic-forum__row:last-child {
  border-bottom: none;
}

.classic-forum__row--alt {
  background: rgba(255, 255, 255, 0.015);
}

.classic-forum__row:hover {
  background: rgba(99, 102, 241, 0.12);
}

.classic-forum__row--head {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: default;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.45);
  padding-top: 6px;
  padding-bottom: 6px;
}

.classic-forum__row--head:hover {
  background: rgba(255, 255, 255, 0.03);
}

.classic-forum__cell {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
  min-width: 0;
}

.classic-forum__cell--num {
  justify-content: center;
  font-family: ui-monospace, 'Lucida Console', monospace;
  color: rgba(255, 255, 255, 0.7);
}

.classic-forum__cell--date {
  justify-content: flex-end;
  font-family: ui-monospace, 'Lucida Console', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.classic-forum__topic-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.18);
  color: rgb(165, 180, 252);
  border: 1px solid rgba(129, 140, 248, 0.32);
}

.classic-forum__namecol {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.classic-forum__topic-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-decoration: underline;
  text-decoration-color: rgba(165, 180, 252, 0.4);
  text-underline-offset: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.classic-forum__row:hover .classic-forum__topic-name {
  color: rgb(199, 210, 254);
  text-decoration-color: rgb(199, 210, 254);
}

.classic-forum__topic-meta {
  margin-top: 1px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  font-family: ui-monospace, 'Lucida Console', monospace;
  font-style: italic;
}

.classic-forum__empty {
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-top: none;
  border-radius: 0 0 4px 4px;
}
</style>
