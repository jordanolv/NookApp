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
const { t } = useI18n();

type Section = {
  key: string;
  title: string;
  description: string;
  rows: ForumRow[];
};

type ForumRow = {
  channel: ChannelPublic;
  topics: number;
  posts: number;
  lastActivity: string | null;
  kind: 'forum' | 'text';
};

function topicsCount(channel: ChannelPublic): number {
  if (channel.type === 'forum') {
    return store.channels.filter((c) => c.parentId === channel.id).length;
  }
  return 1;
}

function postsCount(channel: ChannelPublic): number {
  if (channel.type === 'forum') {
    return store.channels
      .filter((c) => c.parentId === channel.id)
      .reduce((sum, post) => sum + (messagesStore.countFor(post.id) ?? 0), 0);
  }
  return messagesStore.countFor(channel.id) ?? 0;
}

function lastActivityFor(channel: ChannelPublic): string | null {
  if (channel.type === 'forum') {
    const posts = store.channels.filter((c) => c.parentId === channel.id);
    if (!posts.length) return null;
    const latest = posts.reduce((acc, p) =>
      new Date(p.createdAt).getTime() > new Date(acc.createdAt).getTime() ? p : acc,
    );
    return latest.name;
  }
  const msgs = messagesStore.forChannel(channel.id);
  const last = msgs[msgs.length - 1];
  if (!last) return null;
  return `${last.authorId.slice(0, 8)} · ${last.content.replace(/\s+/g, ' ').slice(0, 36)}${
    last.content.length > 36 ? '…' : ''
  }`;
}

const sections = computed<Section[]>(() => {
  const forums = store.channels
    .filter((c) => c.serverId === props.serverId && c.type === 'forum' && !c.parentId)
    .map<ForumRow>((c) => ({
      channel: c,
      topics: topicsCount(c),
      posts: postsCount(c),
      lastActivity: lastActivityFor(c),
      kind: 'forum',
    }));

  const texts = store.channels
    .filter((c) => c.serverId === props.serverId && c.type === 'text' && !c.parentId)
    .map<ForumRow>((c) => ({
      channel: c,
      topics: 1,
      posts: postsCount(c),
      lastActivity: lastActivityFor(c),
      kind: 'text',
    }));

  const out: Section[] = [];
  if (forums.length) {
    out.push({
      key: 'forums',
      title: t('lobby.forumHighlights'),
      description: 'Threads and long-running discussions.',
      rows: forums,
    });
  }
  if (texts.length) {
    out.push({
      key: 'texts',
      title: t('lobby.recentMessages'),
      description: 'Casual channels — drop a message.',
      rows: texts.sort((a, b) => b.posts - a.posts),
    });
  }
  return out;
});

const totalTopics = computed(() =>
  sections.value.reduce((sum, s) => sum + s.rows.reduce((a, r) => a + r.topics, 0), 0),
);
const totalPosts = computed(() =>
  sections.value.reduce((sum, s) => sum + s.rows.reduce((a, r) => a + r.posts, 0), 0),
);

function openRow(row: ForumRow) {
  if (row.kind === 'forum') emit('open-forum', row.channel.id);
  else emit('open-channel', row.channel.id);
}
</script>

<template>
  <div class="forum-index">
    <header class="forum-index__crown">
      <div class="forum-index__crown-row">
        <h1 class="forum-index__title">{{ store.current?.name ?? t('lobby.heading') }}</h1>
        <span class="forum-index__crown-meta">Board index</span>
      </div>
      <p class="forum-index__crown-sub">{{ t('lobby.subtitle') }}</p>
      <p class="forum-index__crown-stats">
        <strong>{{ totalTopics }}</strong> topics · <strong>{{ totalPosts }}</strong> posts
      </p>
    </header>

    <div v-if="!sections.length" class="forum-empty">{{ t('lobby.noActivity') }}</div>

    <section v-for="section in sections" :key="section.key" class="forum-section">
      <header class="forum-section__head">
        <h2>{{ section.title }}</h2>
        <p>{{ section.description }}</p>
      </header>

      <div class="forum-table" role="table">
        <div class="forum-table__head" role="row">
          <div class="forum-table__cell forum-table__cell--name" role="columnheader">Forum</div>
          <div class="forum-table__cell forum-table__cell--num" role="columnheader">Topics</div>
          <div class="forum-table__cell forum-table__cell--num" role="columnheader">Posts</div>
          <div class="forum-table__cell forum-table__cell--last" role="columnheader">Last post</div>
        </div>

        <div
          v-for="(row, i) in section.rows"
          :key="row.channel.id"
          class="forum-table__row"
          :class="{ 'forum-table__row--alt': i % 2 === 1 }"
          role="row"
          @click="openRow(row)"
        >
          <div class="forum-table__cell forum-table__cell--name" role="cell">
            <span
              class="forum-table__icon"
              :class="`forum-table__icon--${row.kind}`"
              aria-hidden="true"
            >
              <svg
                v-if="row.kind === 'forum'"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"
                />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </span>
            <div class="forum-table__namecol">
              <span class="forum-table__channel">{{ row.channel.name }}</span>
              <span class="forum-table__channel-kind">{{
                row.kind === 'forum' ? 'Forum board' : 'Text channel'
              }}</span>
            </div>
          </div>
          <div class="forum-table__cell forum-table__cell--num" role="cell">
            {{ row.topics }}
          </div>
          <div class="forum-table__cell forum-table__cell--num" role="cell">
            {{ row.posts }}
          </div>
          <div class="forum-table__cell forum-table__cell--last" role="cell">
            <template v-if="row.lastActivity">
              <span class="forum-table__last-arrow">▸</span>
              <span class="forum-table__last-text">{{ row.lastActivity }}</span>
            </template>
            <span v-else class="forum-table__last-empty">— no posts —</span>
          </div>
        </div>
      </div>
    </section>

    <footer class="forum-index__footer">
      <span>NookApp Forum · Powered by Nook</span>
      <span>All times shown for your current locale.</span>
    </footer>
  </div>
</template>

<style scoped>
.forum-index {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 36px 56px;
  height: 100%;
  overflow-y: auto;
  color: rgba(230, 232, 240, 0.85);
  font-family: 'Verdana', 'Geneva', 'Tahoma', sans-serif;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.forum-index__crown {
  position: relative;
  padding: 18px 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background:
    linear-gradient(180deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04) 80%),
    rgba(15, 16, 24, 0.7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.forum-index__crown-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.forum-index__title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.01em;
}

.forum-index__crown-meta {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(165, 180, 252, 0.85);
}

.forum-index__crown-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.forum-index__crown-stats {
  margin: 10px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.forum-index__crown-stats strong {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 700;
}

.forum-section {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  background: rgba(15, 16, 24, 0.55);
}

.forum-section__head {
  padding: 10px 14px;
  background:
    linear-gradient(180deg, rgba(99, 102, 241, 0.22), rgba(99, 102, 241, 0.08)),
    rgba(20, 22, 32, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.forum-section__head h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.forum-section__head p {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

.forum-table {
  display: flex;
  flex-direction: column;
}

.forum-table__head {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 80px 80px minmax(220px, 1.4fr);
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.45);
}

.forum-table__row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 80px 80px minmax(220px, 1.4fr);
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 100ms;
}

.forum-table__row:last-child {
  border-bottom: none;
}

.forum-table__row--alt {
  background: rgba(255, 255, 255, 0.015);
}

.forum-table__row:hover {
  background: rgba(99, 102, 241, 0.12);
}

.forum-table__cell {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.78);
}

.forum-table__cell--num {
  justify-content: center;
  font-family: ui-monospace, 'Lucida Console', monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.forum-table__cell--last {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  min-width: 0;
}

.forum-table__icon {
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

.forum-table__icon--text {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(134, 239, 172);
  border-color: rgba(74, 222, 128, 0.32);
}

.forum-table__namecol {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.forum-table__channel {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-decoration: underline;
  text-decoration-color: rgba(165, 180, 252, 0.45);
  text-underline-offset: 2px;
}

.forum-table__row:hover .forum-table__channel {
  color: rgb(199, 210, 254);
  text-decoration-color: rgb(199, 210, 254);
}

.forum-table__channel-kind {
  margin-top: 1px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

.forum-table__last-arrow {
  color: rgb(165, 180, 252);
  font-size: 11px;
  flex-shrink: 0;
}

.forum-table__last-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, 'Lucida Console', monospace;
}

.forum-table__last-empty {
  color: rgba(255, 255, 255, 0.25);
  font-style: italic;
}

.forum-empty {
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}

.forum-index__footer {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

@media (max-width: 1100px) {
  .forum-index {
    padding: 20px 22px 40px;
  }
  .forum-table__head,
  .forum-table__row {
    grid-template-columns: minmax(160px, 1fr) 60px 60px minmax(140px, 1fr);
    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
