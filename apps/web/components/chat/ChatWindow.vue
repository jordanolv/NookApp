<script setup lang="ts">
import { Settings } from 'lucide-vue-next';

const props = defineProps<{
  channelId: string;
  initialX: number;
  initialY: number;
  zIndex: number;
}>();

const emit = defineEmits<{
  close: [];
  focus: [];
  'drag-start': [];
  'drag-end': [x: number, y: number];
}>();

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);
const { store } = useServers();
const { isAdmin } = useMember();

const showEdit = ref(false);
const channel = computed(() => store.channels.find((c) => c.id === props.channelId) ?? null);

// ── Manual drag ──
const panelX = ref(props.initialX);
const panelY = ref(props.initialY);
const _drag = ref<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

function onHandleMousedown(e: MouseEvent) {
  _drag.value = { startX: e.clientX, startY: e.clientY, origX: panelX.value, origY: panelY.value };
  emit('drag-start');
  e.preventDefault();
}

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
  if (_drag.value) {
    panelX.value = _drag.value.origX + (e.clientX - _drag.value.startX);
    panelY.value = _drag.value.origY + (e.clientY - _drag.value.startY);
  }
  if (!resizingEdge) return;
  const dx = e.clientX - rStartX;
  const dy = e.clientY - rStartY;
  if (resizingEdge === 'right' || resizingEdge === 'corner')
    width.value = Math.max(300, Math.min(900, rStartW + dx));
  if (resizingEdge === 'bottom' || resizingEdge === 'corner')
    height.value = Math.max(280, Math.min(900, rStartH + dy));
}

function onMouseUp(e: MouseEvent) {
  if (_drag.value) {
    _drag.value = null;
    emit('drag-end', e.clientX, e.clientY);
  }
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

const panelStyle = computed(() => ({
  position: 'fixed' as const,
  left: panelX.value + 'px',
  top: panelY.value + 'px',
  width: width.value + 'px',
  height: height.value + 'px',
  zIndex: props.zIndex,
  // Disable pointer events while dragging so mouseup reaches elements underneath (e.g. tab bar)
  pointerEvents: (_drag.value ? 'none' : 'auto') as 'none' | 'auto',
  background: 'rgba(10, 10, 16, 0.82)',
  backdropFilter: 'blur(28px) saturate(160%)',
  WebkitBackdropFilter: 'blur(28px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
}));
</script>

<template>
  <div
    class="flex flex-col rounded-2xl overflow-hidden"
    :style="panelStyle"
    @mousedown="emit('focus')"
  >
    <!-- Title bar / drag handle -->
    <div
      class="flex flex-shrink-0 items-center gap-2 px-3.5 py-2.5 cursor-grab active:cursor-grabbing select-none"
      style="border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
      @mousedown="onHandleMousedown"
    >
      <button
        class="h-3 w-3 rounded-full flex-shrink-0 transition-opacity hover:opacity-75"
        style="background: #ef4444"
        title="Fermer"
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

    <ChatPane :channel-id="channelId" />

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
