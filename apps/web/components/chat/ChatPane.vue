<script setup lang="ts">
import { useMessagesStore } from '~/stores/messages';
import { renderMarkdown, isGifUrl } from '~/composables/useMarkdown';

const props = defineProps<{
  channelId: string;
}>();

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);
const { store } = useServers();
const { fetchMessages, sendMessage, editMessage, deleteMessage } = useMessages();
const messagesStore = useMessagesStore();
const socket = useSocket();
const auth = useAuthStore();

const editingId = ref<string | null>(null);
const editDraft = ref('');

const channel = computed(() => store.channels.find((c) => c.id === props.channelId) ?? null);
const messages = computed(() => messagesStore.forChannel(props.channelId));
const loading = computed(() => messagesStore.isLoading(props.channelId));

const sending = ref(false);
const listEl = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
  });
}

watch(
  () => props.channelId,
  async (id) => {
    await fetchMessages(serverId.value, id);
    scrollToBottom();
  },
  { immediate: true },
);

onMounted(() => {
  const offSent = socket.onMessage((msg) => {
    if (msg.channelId === props.channelId) {
      messagesStore.appendMessage(props.channelId, msg);
      scrollToBottom();
    }
  });
  const offUpdated = socket.onMessageUpdated((msg) => {
    if (msg.channelId === props.channelId) messagesStore.updateMessage(props.channelId, msg);
  });
  const offDeleted = socket.onMessageDeleted((payload) => {
    if (payload.channelId === props.channelId) {
      messagesStore.removeMessage(props.channelId, payload.id);
      if (editingId.value === payload.id) cancelEdit();
    }
  });
  onUnmounted(() => {
    offSent();
    offUpdated();
    offDeleted();
  });
});

function canManage(authorId: string): boolean {
  return auth.user?.id === authorId;
}

function startEdit(msg: { id: string; content: string }) {
  editingId.value = msg.id;
  editDraft.value = msg.content;
}

function cancelEdit() {
  editingId.value = null;
  editDraft.value = '';
}

async function saveEdit(messageId: string) {
  const content = editDraft.value.trim();
  if (!content) return;
  await editMessage(serverId.value, props.channelId, messageId, { content });
  cancelEdit();
}

async function onDelete(messageId: string) {
  if (!window.confirm('Supprimer ce message ?')) return;
  await deleteMessage(serverId.value, props.channelId, messageId);
}

async function onSend(content: string) {
  if (sending.value) return;
  sending.value = true;
  try {
    await sendMessage(serverId.value, props.channelId, { content });
  } finally {
    sending.value = false;
  }
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
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <!-- role=log + aria-live : les messages arrivent sans action de
         l'utilisateur, un lecteur d'ecran doit donc les annoncer. `polite`
         attend une pause plutot que d'interrompre la lecture en cours. -->
    <div
      ref="listEl"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      :aria-label="$t('chat.messagesLabel')"
      class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5"
      style="scrollbar-width: thin; scrollbar-color: var(--surface-divider) transparent"
    >
      <div
        v-if="loading"
        class="flex items-center justify-center h-24"
        :style="{ color: 'var(--ink-faint)' }"
      >
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
          :style="{ borderColor: 'var(--accent-violet)', borderTopColor: 'transparent' }"
        />
      </div>
      <div
        v-else-if="messages.length === 0"
        class="flex items-center justify-center h-24 text-xs"
        :style="{ color: 'var(--ink-faint)' }"
      >
        Aucun message
      </div>
      <template v-else>
        <div
          v-for="(msg, i) in messages"
          :key="msg.id"
          class="relative flex gap-2.5 group rounded-xl px-2 py-0 transition-colors"
          :class="{ 'mt-1.5': i > 0 && showHeader(i) }"
          :style="{ color: 'var(--ink-soft)' }"
        >
          <div
            v-if="showHeader(i)"
            class="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
            :style="{
              background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cool))',
              color: '#fff',
            }"
          >
            {{ msg.authorId.slice(0, 2).toUpperCase() }}
          </div>
          <div v-else class="w-7 flex-shrink-0" />
          <div class="flex flex-col min-w-0">
            <div v-if="showHeader(i)" class="flex items-baseline gap-2 mb-0.5">
              <span class="text-xs font-semibold" :style="{ color: 'var(--ink)' }">
                {{ msg.authorId.slice(0, 8) }}
              </span>
              <span class="text-xs" :style="{ color: 'var(--ink-muted)' }">{{
                formatTime(msg.createdAt)
              }}</span>
            </div>
            <div v-if="editingId === msg.id" class="flex flex-col gap-1.5 mt-0.5">
              <textarea
                v-model="editDraft"
                rows="2"
                class="text-sm rounded-lg px-2.5 py-1.5 resize-none outline-none"
                :style="{
                  background: 'var(--surface-tinted-strong)',
                  color: 'var(--ink)',
                  border: '1px solid var(--surface-border)',
                }"
                @keydown.enter.exact.prevent="saveEdit(msg.id)"
                @keydown.esc.prevent="cancelEdit"
              />
              <div class="flex gap-2 text-xs">
                <button
                  class="font-medium"
                  :style="{ color: 'var(--accent-violet)' }"
                  @click="saveEdit(msg.id)"
                >
                  Enregistrer
                </button>
                <button :style="{ color: 'var(--ink-muted)' }" @click="cancelEdit">Annuler</button>
              </div>
            </div>
            <div
              v-else
              class="text-sm break-words leading-relaxed message-content"
              :style="{ color: 'var(--ink-soft)' }"
              v-html="renderContent(msg.content)"
            />
            <span
              v-if="msg.editedAt && editingId !== msg.id"
              class="text-[10px] mt-0.5"
              :style="{ color: 'var(--ink-faint)' }"
            >
              (modifié)
            </span>
          </div>
          <div
            v-if="canManage(msg.authorId) && editingId !== msg.id"
            class="absolute right-2 -top-2 hidden group-hover:flex gap-0.5 rounded-lg px-0.5 py-0.5"
            :style="{
              background: 'var(--surface-raised)',
              border: '1px solid var(--surface-border)',
            }"
          >
            <button
              class="px-1.5 py-0.5 text-xs rounded-md"
              :style="{ color: 'var(--ink-muted)' }"
              title="Modifier"
              @click="startEdit(msg)"
            >
              ✏️
            </button>
            <button
              class="px-1.5 py-0.5 text-xs rounded-md"
              :style="{ color: 'var(--accent-danger, #e5484d)' }"
              title="Supprimer"
              @click="onDelete(msg.id)"
            >
              🗑️
            </button>
          </div>
        </div>
      </template>
    </div>

    <ChatMessageInput
      :placeholder="`Message #${channel?.name ?? '…'}`"
      :disabled="sending"
      @send="onSend"
    />
  </div>
</template>

<style>
.message-content p {
  margin: 0;
}
.message-content p + p {
  margin-top: 0.25rem;
}
.message-content strong {
  color: var(--ink);
  font-weight: 600;
}
.message-content em {
  color: var(--ink-soft);
}
.message-content del {
  opacity: 0.5;
}
.message-content code {
  font-family: ui-monospace, monospace;
  font-size: 0.8em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--surface-tinted-strong);
  color: var(--accent-violet);
}
.message-content pre {
  margin: 0.4rem 0;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: var(--surface-tinted-strong);
  overflow-x: auto;
  border: 1px solid var(--surface-border);
}
.message-content pre code {
  background: none;
  padding: 0;
  font-size: 0.78em;
  color: var(--ink-soft);
}
.message-content a {
  color: var(--accent-cool);
  text-decoration: underline;
}
</style>
