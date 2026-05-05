<script setup lang="ts">
const props = defineProps<{
  channelIds: string[];
  activeId: string | null;
  draggingChannelId?: string | null;
}>();

const emit = defineEmits<{
  close: [channelId: string];
  'set-active': [channelId: string];
  'tear-off': [channelId: string, x: number, y: number];
  dock: [channelId: string];
}>();

function onContainerMouseup() {
  if (props.draggingChannelId) emit('dock', props.draggingChannelId);
}

const { store } = useServers();

function channelName(id: string) {
  return store.channels.find((c) => c.id === id)?.name ?? '…';
}

// ── Window position & size ──
const posX = ref(80);
const posY = ref(80);
const w = ref(480);
const h = ref(520);

// ── Window drag (from tab strip background) ──
const _winDrag = ref<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

function startWinDrag(e: MouseEvent) {
  _winDrag.value = { startX: e.clientX, startY: e.clientY, origX: posX.value, origY: posY.value };
  e.preventDefault();
}

// ── Window resize ──
const _winResize = ref<{
  startX: number;
  startY: number;
  origW: number;
  origH: number;
  origX: number;
  origY: number;
  dir: 'tl' | 'tr' | 'bl' | 'br';
} | null>(null);

function startWinResize(e: MouseEvent, dir: 'tl' | 'tr' | 'bl' | 'br') {
  _winResize.value = {
    startX: e.clientX,
    startY: e.clientY,
    origW: w.value,
    origH: h.value,
    origX: posX.value,
    origY: posY.value,
    dir,
  };
  e.preventDefault();
  e.stopPropagation();
}

// ── Tab tear-off ──
const _tearDrag = ref<{
  channelId: string;
  startX: number;
  startY: number;
  ghostX: number;
  ghostY: number;
  tearing: boolean;
} | null>(null);

function onTabMousedown(channelId: string, e: MouseEvent) {
  _tearDrag.value = {
    channelId,
    startX: e.clientX,
    startY: e.clientY,
    ghostX: e.clientX,
    ghostY: e.clientY,
    tearing: false,
  };
  e.preventDefault();
  e.stopPropagation();
}

// ── Global mouse handlers ──
const M = 4;

function onGlobalMousemove(e: MouseEvent) {
  if (_winDrag.value) {
    const dx = e.clientX - _winDrag.value.startX;
    const dy = e.clientY - _winDrag.value.startY;
    posX.value = Math.max(M, Math.min(window.innerWidth - w.value - M, _winDrag.value.origX + dx));
    posY.value = Math.max(M, Math.min(window.innerHeight - h.value - M, _winDrag.value.origY + dy));
  }
  if (_winResize.value) {
    const { startX, startY, origW, origH, origX, origY, dir } = _winResize.value;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dir === 'br') {
      w.value = Math.max(300, Math.min(window.innerWidth - origX - M, origW + dx));
      h.value = Math.max(280, Math.min(window.innerHeight - origY - M, origH + dy));
    } else if (dir === 'bl') {
      const newW = Math.max(300, Math.min(origW + origX - M, origW - dx));
      w.value = newW;
      posX.value = Math.max(M, origX + (origW - newW));
      h.value = Math.max(280, Math.min(window.innerHeight - origY - M, origH + dy));
    } else if (dir === 'tr') {
      w.value = Math.max(300, Math.min(window.innerWidth - origX - M, origW + dx));
      const newH = Math.max(280, Math.min(origH + origY - M, origH - dy));
      h.value = newH;
      posY.value = Math.max(M, origY + (origH - newH));
    } else if (dir === 'tl') {
      const newW = Math.max(300, Math.min(origW + origX - M, origW - dx));
      const newH = Math.max(280, Math.min(origH + origY - M, origH - dy));
      w.value = newW;
      h.value = newH;
      posX.value = Math.max(M, origX + (origW - newW));
      posY.value = Math.max(M, origY + (origH - newH));
    }
  }
  if (_tearDrag.value) {
    _tearDrag.value.ghostX = e.clientX;
    _tearDrag.value.ghostY = e.clientY;
    const dx = e.clientX - _tearDrag.value.startX;
    const dy = e.clientY - _tearDrag.value.startY;
    if (!_tearDrag.value.tearing && (Math.abs(dx) > 20 || Math.abs(dy) > 30)) {
      _tearDrag.value.tearing = true;
    }
  }
}

function onGlobalMouseup(e: MouseEvent) {
  if (_tearDrag.value) {
    if (_tearDrag.value.tearing) {
      emit('tear-off', _tearDrag.value.channelId, e.clientX - 200, e.clientY - 20);
    } else {
      emit('set-active', _tearDrag.value.channelId);
    }
    _tearDrag.value = null;
  }
  _winDrag.value = null;
  _winResize.value = null;
}

onMounted(() => {
  window.addEventListener('mousemove', onGlobalMousemove);
  window.addEventListener('mouseup', onGlobalMouseup);
});
onUnmounted(() => {
  window.removeEventListener('mousemove', onGlobalMousemove);
  window.removeEventListener('mouseup', onGlobalMouseup);
});

const windowStyle = computed(() => {
  const active = _winDrag.value !== null || _winResize.value !== null;
  return {
    left: posX.value + 'px',
    top: posY.value + 'px',
    width: w.value + 'px',
    height: h.value + 'px',
    transition: active ? 'none' : undefined,
    background: 'rgba(10, 10, 16, 0.82)',
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
  };
});
</script>

<template>
  <!-- Tear-off ghost follows cursor -->
  <Teleport to="body">
    <div
      v-if="_tearDrag?.tearing"
      class="fixed z-[200] pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium select-none"
      :style="{
        left: _tearDrag.ghostX - 40 + 'px',
        top: _tearDrag.ghostY - 14 + 'px',
        background: 'rgba(10, 10, 16, 0.92)',
        border: '1px solid rgba(99, 102, 241, 0.6)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        color: 'rgba(255,255,255,0.75)',
      }"
    >
      # {{ channelName(_tearDrag.channelId) }}
    </div>
  </Teleport>

  <div
    class="fixed z-30 flex flex-col rounded-2xl overflow-hidden"
    :style="windowStyle"
    @mousedown.self.stop
    @mouseup="onContainerMouseup"
  >
    <!-- Drop zone highlight when a floating window is being dragged -->
    <Transition name="dock-hint">
      <div
        v-if="draggingChannelId"
        class="absolute inset-0 rounded-2xl pointer-events-none z-[60]"
        style="border: 1.5px dashed rgba(99, 102, 241, 0.7); background: rgba(99, 102, 241, 0.06)"
      >
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium px-3 py-1.5 rounded-xl"
          style="
            background: rgba(99, 102, 241, 0.25);
            color: rgba(165, 180, 252, 0.9);
            border: 1px solid rgba(99, 102, 241, 0.4);
          "
        >
          Déposer pour ajouter l'onglet
        </div>
      </div>
    </Transition>
    <!-- Corner resize handles -->
    <div
      class="absolute top-0 left-0 w-5 h-5 z-50 cursor-nw-resize opacity-0 hover:opacity-100 transition-opacity"
      style="
        border-top: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-left: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-radius: 14px 0 0 0;
      "
      @mousedown="(e) => startWinResize(e, 'tl')"
    />
    <div
      class="absolute top-0 right-0 w-5 h-5 z-50 cursor-ne-resize opacity-0 hover:opacity-100 transition-opacity"
      style="
        border-top: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-right: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-radius: 0 14px 0 0;
      "
      @mousedown="(e) => startWinResize(e, 'tr')"
    />
    <div
      class="absolute bottom-0 left-0 w-5 h-5 z-50 cursor-sw-resize opacity-0 hover:opacity-100 transition-opacity"
      style="
        border-bottom: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-left: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-radius: 0 0 0 14px;
      "
      @mousedown="(e) => startWinResize(e, 'bl')"
    />
    <div
      class="absolute bottom-0 right-0 w-5 h-5 z-50 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
      style="
        border-bottom: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-right: 1.5px dashed rgba(255, 255, 255, 0.25);
        border-radius: 0 0 14px 0;
      "
      @mousedown="(e) => startWinResize(e, 'br')"
    />

    <!-- Tab strip — drag zone between tabs moves the window -->
    <div
      class="flex flex-shrink-0 items-end gap-0 px-2 pt-2 select-none cursor-grab active:cursor-grabbing"
      style="border-bottom: 1px solid rgba(255, 255, 255, 0.07); min-height: 36px"
      @mousedown="startWinDrag"
    >
      <div
        v-for="channelId in channelIds"
        :key="channelId"
        class="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-xs font-medium transition-colors select-none"
        :style="
          channelId === activeId
            ? 'background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.85); cursor: pointer'
            : 'color: rgba(255,255,255,0.35); cursor: pointer'
        "
        @mousedown.stop="onTabMousedown(channelId, $event)"
      >
        <!-- Dim overlay on the tab being torn -->
        <span
          v-if="_tearDrag?.channelId === channelId && _tearDrag.tearing"
          class="absolute inset-0 rounded-t-lg"
          style="background: rgba(99, 102, 241, 0.2); border: 1px dashed rgba(99, 102, 241, 0.4)"
        />
        <span class="truncate max-w-[110px]"># {{ channelName(channelId) }}</span>
        <button
          class="flex-shrink-0 ml-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center transition-opacity opacity-40 hover:opacity-100"
          style="color: rgba(255, 255, 255, 0.7)"
          @mousedown.stop
          @click.stop="emit('close', channelId)"
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Active chat -->
    <ChatPane v-if="activeId" :key="activeId" :channel-id="activeId" />
    <div
      v-else
      class="flex-1 flex items-center justify-center text-xs"
      style="color: rgba(255, 255, 255, 0.2)"
    >
      Aucun canal ouvert
    </div>
  </div>
</template>

<style scoped>
.dock-hint-enter-active,
.dock-hint-leave-active {
  transition: opacity 0.15s ease;
}
.dock-hint-enter-from,
.dock-hint-leave-to {
  opacity: 0;
}
</style>
