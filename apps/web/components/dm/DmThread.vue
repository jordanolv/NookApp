<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { DmConversation } from '@nookapp/protocol';
import { renderMarkdown, isGifUrl } from '~/composables/useMarkdown';
import { useDms } from '~/composables/useDms';

const props = defineProps<{
  conversation: DmConversation;
  me: string;
}>();

const { store, fetchMessages, sendMessage, markRead } = useDms();
const { user } = useAuth();
const { appearance } = useCharacter();
const socket = useSocket();

const messages = computed(() => store.forConversation(props.conversation.id));
const loading = computed(() => store.isLoading(props.conversation.id));

const sending = ref(false);
const listEl = ref<HTMLElement | null>(null);
const theyAreTyping = ref(false);
let typingClearTimer: ReturnType<typeof setTimeout> | null = null;
let lastTypingSentAt = 0;
let offTyping: (() => void) | null = null;

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
  });
}

watch(
  () => props.conversation.id,
  async (id) => {
    theyAreTyping.value = false;
    await fetchMessages(id);
    scrollToBottom();
    void markRead(id);
  },
  { immediate: true },
);

watch(
  () => messages.value.length,
  () => scrollToBottom(),
);

onMounted(() => {
  offTyping = socket.onDmTyping((payload) => {
    if (
      payload.conversationId !== props.conversation.id ||
      payload.fromUserId !== props.conversation.otherUser.id
    )
      return;
    theyAreTyping.value = true;
    if (typingClearTimer) clearTimeout(typingClearTimer);
    typingClearTimer = setTimeout(() => (theyAreTyping.value = false), 3500);
  });
});

onUnmounted(() => {
  offTyping?.();
  if (typingClearTimer) clearTimeout(typingClearTimer);
});

async function onSend(content: string) {
  if (sending.value) return;
  sending.value = true;
  try {
    await sendMessage(props.conversation.id, { content });
  } finally {
    sending.value = false;
  }
}

function onTyping() {
  const now = Date.now();
  if (now - lastTypingSentAt < 2000) return;
  lastTypingSentAt = now;
  socket.emitDmTyping({
    conversationId: props.conversation.id,
    toUserId: props.conversation.otherUser.id,
  });
}

function isMine(authorId: string): boolean {
  return authorId === props.me;
}

function authorName(authorId: string): string {
  return isMine(authorId) ? (user.value?.name ?? 'Moi') : props.conversation.otherUser.name;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderContent(content: string): string {
  const gif = isGifUrl(content);
  if (gif) return `<img src="${gif}" class="rounded-lg max-h-48 mt-1" style="max-width:100%" />`;
  return renderMarkdown(content);
}

const GROUP_GAP_MS = 2 * 60 * 1000;
function showHeader(i: number): boolean {
  if (i === 0) return true;
  const prev = messages.value[i - 1];
  const cur = messages.value[i];
  if (!prev || prev.authorId !== cur.authorId) return true;
  return new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP_MS;
}
</script>

<template>
  <div class="dm-thread">
    <header class="dm-thread__head">
      <DmAvatar
        :name="conversation.otherUser.name"
        :avatar-url="conversation.otherUser.avatarUrl"
        :size="30"
      />
      <span class="dm-thread__name">{{ conversation.otherUser.name }}</span>
    </header>

    <div
      ref="listEl"
      class="dm-thread__list"
      style="scrollbar-width: thin; scrollbar-color: var(--surface-divider) transparent"
    >
      <div v-if="loading" class="dm-thread__center">
        <div class="dm-thread__spinner" />
      </div>
      <div v-else-if="messages.length === 0" class="dm-thread__center dm-thread__hint">
        Dis bonjour à {{ conversation.otherUser.name }} 👋
      </div>
      <template v-else>
        <div
          v-for="(msg, i) in messages"
          :key="msg.id"
          class="dm-thread__row"
          :class="{ 'dm-thread__row--spaced': i > 0 && showHeader(i) }"
        >
          <div v-if="showHeader(i)" class="dm-thread__avatar">
            <UserCharacterAvatar v-if="isMine(msg.authorId)" :appearance="appearance" :size="28" />
            <DmAvatar
              v-else
              :name="conversation.otherUser.name"
              :avatar-url="conversation.otherUser.avatarUrl"
              :size="28"
            />
          </div>
          <div v-else class="dm-thread__avatar dm-thread__avatar--spacer" />
          <div class="dm-thread__body">
            <div v-if="showHeader(i)" class="dm-thread__byline">
              <span class="dm-thread__author">{{ authorName(msg.authorId) }}</span>
              <span class="dm-thread__time">{{ formatTime(msg.createdAt) }}</span>
            </div>
            <div class="dm-thread__content message-content" v-html="renderContent(msg.content)" />
          </div>
        </div>
      </template>
    </div>

    <div class="dm-thread__typing">
      <span v-if="theyAreTyping">{{ conversation.otherUser.name }} écrit…</span>
    </div>

    <ChatMessageInput
      :placeholder="`Message à ${conversation.otherUser.name}`"
      :disabled="sending"
      @send="onSend"
      @typing="onTyping"
    />
  </div>
</template>

<style scoped>
.dm-thread {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.dm-thread__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--surface-divider);
}
.dm-thread__name {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
}
.dm-thread__list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dm-thread__center {
  display: grid;
  place-items: center;
  height: 100%;
}
.dm-thread__hint {
  font-size: 13px;
  color: var(--ink-faint);
}
.dm-thread__spinner {
  height: 18px;
  width: 18px;
  border-radius: 50%;
  border: 2px solid var(--accent-violet);
  border-top-color: transparent;
  animation: dm-spin 0.7s linear infinite;
}
@keyframes dm-spin {
  to {
    transform: rotate(360deg);
  }
}
.dm-thread__row {
  display: flex;
  gap: 10px;
  padding: 0 2px;
}
.dm-thread__row--spaced {
  margin-top: 8px;
}
.dm-thread__avatar {
  width: 28px;
  flex-shrink: 0;
}
.dm-thread__avatar--spacer {
  height: 1px;
}
.dm-thread__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.dm-thread__byline {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 1px;
}
.dm-thread__author {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}
.dm-thread__time {
  font-size: 11px;
  color: var(--ink-muted);
}
.dm-thread__content {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-soft);
  word-break: break-word;
}
.dm-thread__typing {
  height: 16px;
  padding: 0 16px;
  font-size: 11px;
  font-style: italic;
  color: var(--ink-muted);
  flex-shrink: 0;
}
</style>
