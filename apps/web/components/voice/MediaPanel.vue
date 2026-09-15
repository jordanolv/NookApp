<script setup lang="ts">
// The classic view has no sidebar to host the voice stage, so it floats here.
const voice = useVoice();

const isVisible = computed(() => !!voice.currentChannelId.value);

const pos = ref({ x: 16, y: 0 });
const panelW = ref(320);

onMounted(() => {
  pos.value = { x: 16, y: Math.max(16, window.innerHeight - 420) };
});

let dragOffset = { x: 0, y: 0 };

function onDragStart(e: MouseEvent) {
  dragOffset = { x: e.clientX - pos.value.x, y: e.clientY - pos.value.y };
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd, { once: true });
}

function onDragMove(e: MouseEvent) {
  pos.value = {
    x: Math.max(0, Math.min(window.innerWidth - panelW.value, e.clientX - dragOffset.x)),
    y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y)),
  };
}

function onDragEnd() {
  window.removeEventListener('mousemove', onDragMove);
}

let resizeStartX = 0;
let resizeStartW = 0;

function onResizeStart(e: MouseEvent) {
  e.stopPropagation();
  resizeStartX = e.clientX;
  resizeStartW = panelW.value;
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', onResizeEnd, { once: true });
}

function onResizeMove(e: MouseEvent) {
  panelW.value = Math.max(240, Math.min(960, resizeStartW + e.clientX - resizeStartX));
}

function onResizeEnd() {
  window.removeEventListener('mousemove', onResizeMove);
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mousemove', onResizeMove);
});
</script>

<template>
  <div
    v-if="isVisible"
    class="media-panel fixed z-40 select-none"
    :style="{ left: pos.x + 'px', top: pos.y + 'px', width: panelW + 'px' }"
  >
    <div class="media-panel__drag" @mousedown="onDragStart" />
    <VoiceStage />
    <div class="media-panel__resize" @mousedown="onResizeStart" />
  </div>
</template>

<style scoped>
.media-panel {
  position: relative;
  max-height: 60vh;
  border-radius: 16px;
  background: var(--surface-strong);
  overflow: hidden;
  border: 1px solid var(--surface-border);
  box-shadow: 0 8px 32px rgba(20, 35, 25, 0.55);
  display: flex;
  flex-direction: column;
}
.media-panel__drag {
  position: absolute;
  top: 0;
  left: 0;
  right: 56px;
  height: 26px;
  cursor: grab;
  z-index: 1;
}
.media-panel__drag:active {
  cursor: grabbing;
}
.media-panel__resize {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
  cursor: ew-resize;
}
</style>
