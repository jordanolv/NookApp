<script setup lang="ts">
import { useMessagesStore } from '~/stores/messages';

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);
const channelId = computed(() => route.params.channelId as string);

const { store: serversStore } = useServers();
const { fetchMessages, sendMessage } = useMessages();
const messagesStore = useMessagesStore();
const socket = useSocket();

const channel = computed(() => serversStore.channels.find((c) => c.id === channelId.value));
const messages = computed(() => messagesStore.forChannel(channelId.value));
const loading = computed(() => messagesStore.isLoading(channelId.value));

const input = ref('');
const sending = ref(false);
const listEl = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
  });
}

// Fetch messages when channel changes
watch(
  channelId,
  async (id) => {
    await fetchMessages(serverId.value, id);
    scrollToBottom();
  },
  { immediate: true },
);

// Real-time: listen for new messages
onMounted(() => {
  const off = socket.onMessage((msg) => {
    if (msg.channelId === channelId.value) {
      messagesStore.appendMessage(channelId.value, msg);
      scrollToBottom();
    }
  });
  onUnmounted(off);
});

async function submit() {
  const content = input.value.trim();
  if (!content || sending.value) return;
  sending.value = true;
  input.value = '';
  try {
    await sendMessage(serverId.value, channelId.value, { content });
    // Server emits via socket → onMessage handles appending
  } catch {
    input.value = content;
  } finally {
    sending.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Messages -->
    <div ref="listEl" class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
      <div v-if="loading" class="flex items-center justify-center h-24 text-neutral-500 text-sm">
        Loading…
      </div>

      <div
        v-else-if="messages.length === 0"
        class="flex items-center justify-center h-24 text-neutral-600 text-sm"
      >
        No messages yet. Say something!
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="msg.id"
        class="flex gap-3 group"
        :class="{ 'mt-3': i > 0 && messages[i - 1]?.authorId !== msg.authorId }"
      >
        <div
          v-if="i === 0 || messages[i - 1]?.authorId !== msg.authorId"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-700 text-xs font-semibold mt-0.5"
        >
          {{ msg.authorId.slice(0, 2).toUpperCase() }}
        </div>
        <div v-else class="w-8 flex-shrink-0" />

        <div class="flex flex-col min-w-0">
          <div
            v-if="i === 0 || messages[i - 1]?.authorId !== msg.authorId"
            class="flex items-baseline gap-2"
          >
            <span class="text-sm font-semibold">{{ msg.authorId.slice(0, 8) }}</span>
            <span class="text-xs text-neutral-500">{{ formatTime(msg.createdAt) }}</span>
          </div>
          <p class="text-sm text-neutral-200 break-words">{{ msg.content }}</p>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="flex-shrink-0 px-4 pb-4">
      <div
        class="flex items-end gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3"
      >
        <textarea
          v-model="input"
          :placeholder="`Message #${channel?.name ?? '…'}`"
          rows="1"
          class="flex-1 resize-none bg-transparent text-sm placeholder-neutral-500 focus:outline-none"
          :class="{ 'opacity-50': sending }"
          @keydown="handleKeydown"
        />
        <button
          :disabled="!input.trim() || sending"
          class="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          @click="submit"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>
