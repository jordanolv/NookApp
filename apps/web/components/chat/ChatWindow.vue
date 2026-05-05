<script setup lang="ts">
import { useDraggable } from '@vueuse/core';
import { Settings } from 'lucide-vue-next';
import { useMessagesStore } from '~/stores/messages';

const props = defineProps<{
  channelId: string;
  initialX: number;
  initialY: number;
  zIndex: number;
}>();

const emit = defineEmits<{
  close: [];
  focus: [];
}>();

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);
const { store } = useServers();
const { isAdmin } = useMember();
const { fetchMessages, sendMessage } = useMessages();

const showEdit = ref(false);
const messagesStore = useMessagesStore();
const socket = useSocket();

const channel = computed(() => store.channels.find((c) => c.id === props.channelId) ?? null);
const messages = computed(() => messagesStore.forChannel(props.channelId));
const loading = computed(() => messagesStore.isLoading(props.channelId));

const input = ref('');
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
  const off = socket.onMessage((msg) => {
    if (msg.channelId === props.channelId) {
      messagesStore.appendMessage(props.channelId, msg);
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
    await sendMessage(serverId.value, props.channelId, { content });
  } catch {
    input.value = content;
  } finally {
    sending.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void submit();
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Drag ──
const panel = ref<HTMLElement | null>(null);
const handle = ref<HTMLElement | null>(null);

const { style: dragStyle } = useDraggable(panel, {
  handle,
  initialValue: { x: props.initialX, y: props.initialY },
  preventDefault: true,
});

// ── Resize ──
const width = ref(400);
const height = ref(540);

type Edge = 'right' | 'bottom' | 'corner';
let resizingEdge: Edge | null = null;
let rStartX = 0,
  rStartY = 0,
  rStartW = 0,
  rStartH = 0;

function startResize(edge: Edge, e: MouseEvent) {
  resizingEdge = edge;
  rStartX = e.clientX;
  rStartY = e.clientY;
  rStartW = width.value;
  rStartH = height.value;
  e.preventDefault();
  e.stopPropagation();
}

function onMouseMove(e: MouseEvent) {
  if (!resizingEdge) return;
  const dx = e.clientX - rStartX;
  const dy = e.clientY - rStartY;
  if (resizingEdge === 'right' || resizingEdge === 'corner')
    width.value = Math.max(300, Math.min(900, rStartW + dx));
  if (resizingEdge === 'bottom' || resizingEdge === 'corner')
    height.value = Math.max(280, Math.min(900, rStartH + dy));
}

function onMouseUp() {
  resizingEdge = null;
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
});
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
  <div
    ref="panel"
    class="fixed flex flex-col rounded-2xl overflow-hidden"
    :style="[
      dragStyle,
      {
        width: width + 'px',
        height: height + 'px',
        zIndex,
        background: 'rgba(10, 10, 16, 0.82)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    ]"
    @mousedown="emit('focus')"
  >
    <!-- Title bar / drag handle -->
    <div
      ref="handle"
      class="flex flex-shrink-0 items-center gap-2 px-3.5 py-2.5 cursor-grab active:cursor-grabbing select-none"
      style="border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
    >
      <!-- Close -->
      <button
        class="h-3 w-3 rounded-full flex-shrink-0 transition-opacity hover:opacity-75"
        style="background: #ef4444"
        title="Close"
        @mousedown.stop
        @click="emit('close')"
      />
      <div
        class="h-3 w-3 rounded-full flex-shrink-0"
        style="background: rgba(255, 255, 255, 0.08)"
      />
      <div
        class="h-3 w-3 rounded-full flex-shrink-0"
        style="background: rgba(255, 255, 255, 0.08)"
      />

      <span
        class="ml-2 text-xs font-semibold truncate flex-1"
        style="color: rgba(255, 255, 255, 0.5)"
      >
        # {{ channel?.name ?? '…' }}
      </span>

      <button
        v-if="isAdmin && channel"
        class="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10"
        style="color: rgba(255, 255, 255, 0.4)"
        title="Modifier le canal"
        @mousedown.stop
        @click.stop="showEdit = true"
      >
        <Settings :size="12" :stroke-width="1.75" />
      </button>
    </div>

    <!-- Messages -->
    <div
      ref="listEl"
      class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5"
      style="scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.08) transparent"
    >
      <div
        v-if="loading"
        class="flex items-center justify-center h-24"
        style="color: rgba(255, 255, 255, 0.2)"
      >
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
        />
      </div>

      <div
        v-else-if="messages.length === 0"
        class="flex items-center justify-center h-24 text-xs"
        style="color: rgba(255, 255, 255, 0.2)"
      >
        No messages yet
      </div>

      <template v-else>
        <div
          v-for="(msg, i) in messages"
          :key="msg.id"
          class="flex gap-2.5 group rounded-xl px-2 py-1 transition-colors"
          :class="{ 'mt-2': i > 0 && messages[i - 1]?.authorId !== msg.authorId }"
          style="color: rgba(255, 255, 255, 0.8)"
        >
          <div
            v-if="i === 0 || messages[i - 1]?.authorId !== msg.authorId"
            class="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
            style="background: linear-gradient(135deg, #6366f1, #4338ca); color: white"
          >
            {{ msg.authorId.slice(0, 2).toUpperCase() }}
          </div>
          <div v-else class="w-7 flex-shrink-0" />

          <div class="flex flex-col min-w-0">
            <div
              v-if="i === 0 || messages[i - 1]?.authorId !== msg.authorId"
              class="flex items-baseline gap-2 mb-0.5"
            >
              <span class="text-xs font-semibold" style="color: rgba(255, 255, 255, 0.85)">
                {{ msg.authorId.slice(0, 8) }}
              </span>
              <span class="text-xs" style="color: rgba(255, 255, 255, 0.25)">{{
                formatTime(msg.createdAt)
              }}</span>
            </div>
            <p class="text-sm break-words leading-relaxed" style="color: rgba(255, 255, 255, 0.7)">
              {{ msg.content }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <!-- Input -->
    <div
      class="flex-shrink-0 px-3 pb-3 pt-2"
      style="border-top: 1px solid rgba(255, 255, 255, 0.05)"
    >
      <div
        class="flex items-end gap-2 rounded-xl px-3 py-2"
        style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.07)"
      >
        <textarea
          v-model="input"
          :placeholder="`Message #${channel?.name ?? '…'}`"
          rows="1"
          class="flex-1 resize-none bg-transparent text-sm focus:outline-none"
          style="color: rgba(255, 255, 255, 0.85); placeholder-color: rgba(255, 255, 255, 0.2)"
          :class="{ 'opacity-50': sending }"
          @keydown="handleKeydown"
        />
        <button
          :disabled="!input.trim() || sending"
          class="flex-shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-all disabled:opacity-30"
          style="background: rgba(99, 102, 241, 0.8); color: white"
          @click="void submit()"
        >
          Send
        </button>
      </div>
    </div>

    <!-- Edit channel modal -->
    <ChannelEditChannelModal
      v-if="showEdit && channel"
      :server-id="serverId"
      :channel="channel"
      @close="showEdit = false"
      @updated="showEdit = false"
    />

    <!-- Resize handles -->
    <div
      class="absolute top-8 right-0 w-1 bottom-4 cursor-ew-resize"
      @mousedown="startResize('right', $event)"
    />
    <div
      class="absolute bottom-0 left-4 right-4 h-1 cursor-ns-resize"
      @mousedown="startResize('bottom', $event)"
    />
    <div
      class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
      @mousedown="startResize('corner', $event)"
    />
  </div>
</template>
