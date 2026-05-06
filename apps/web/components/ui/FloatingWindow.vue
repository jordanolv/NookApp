<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    initialWidth?: number;
    initialHeight?: number;
    initialX?: number | null;
    initialY?: number | null;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    zIndex?: number;
    closeOnEscape?: boolean;
    persistKey?: string | null;
  }>(),
  {
    title: '',
    initialWidth: 640,
    initialHeight: 480,
    initialX: null,
    initialY: null,
    minWidth: 420,
    minHeight: 320,
    maxWidth: 1400,
    maxHeight: 1000,
    zIndex: 70,
    closeOnEscape: true,
    persistKey: null,
  },
);

const layout = useUiLayout();

const emit = defineEmits<{
  close: [];
  focus: [];
  'drag-start': [];
  'drag-end': [x: number, y: number];
}>();

const width = ref(props.initialWidth);
const height = ref(props.initialHeight);
const panelX = ref(0);
const panelY = ref(0);

function clampPosition() {
  if (typeof window === 'undefined') return;
  panelX.value = Math.max(4, Math.min(panelX.value, window.innerWidth - width.value - 4));
  panelY.value = Math.max(4, Math.min(panelY.value, window.innerHeight - height.value - 4));
}

function applyInitial() {
  width.value = Math.min(props.initialWidth, window.innerWidth - 32);
  height.value = Math.min(props.initialHeight, window.innerHeight - 32);
  panelX.value =
    props.initialX !== null
      ? props.initialX
      : Math.max(8, Math.round((window.innerWidth - width.value) / 2));
  panelY.value =
    props.initialY !== null
      ? props.initialY
      : Math.max(8, Math.round((window.innerHeight - height.value) / 2));
}

function applyPersisted() {
  if (!props.persistKey) return false;
  const saved = layout.get(props.persistKey);
  if (!saved) return false;
  if (typeof saved.width === 'number')
    width.value = clampW(Math.min(saved.width, window.innerWidth - 32));
  if (typeof saved.height === 'number')
    height.value = clampH(Math.min(saved.height, window.innerHeight - 32));
  if (typeof saved.x === 'number') panelX.value = saved.x;
  if (typeof saved.y === 'number') panelY.value = saved.y;
  return true;
}

function persistNow() {
  if (!props.persistKey) return;
  layout.set(props.persistKey, {
    x: panelX.value,
    y: panelY.value,
    width: width.value,
    height: height.value,
  });
}

onMounted(() => {
  applyInitial();
  if (props.persistKey) {
    void layout.ensureLoaded().then(() => {
      if (applyPersisted()) clampPosition();
    });
  }
  clampPosition();
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', clampPosition);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', clampPosition);
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closeOnEscape) emit('close');
}

const _drag = ref<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

function onHandleMousedown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
  _drag.value = {
    startX: e.clientX,
    startY: e.clientY,
    origX: panelX.value,
    origY: panelY.value,
  };
  emit('drag-start');
  e.preventDefault();
}

type Edge =
  | 'right'
  | 'bottom'
  | 'left'
  | 'top'
  | 'corner-br'
  | 'corner-bl'
  | 'corner-tr'
  | 'corner-tl';
let resizingEdge: Edge | null = null;
let rStartX = 0;
let rStartY = 0;
let rStartW = 0;
let rStartH = 0;
let rStartPanelX = 0;
let rStartPanelY = 0;

function startResize(edge: Edge, e: MouseEvent) {
  resizingEdge = edge;
  rStartX = e.clientX;
  rStartY = e.clientY;
  rStartW = width.value;
  rStartH = height.value;
  rStartPanelX = panelX.value;
  rStartPanelY = panelY.value;
  e.preventDefault();
  e.stopPropagation();
}

function clampW(v: number) {
  return Math.max(props.minWidth, Math.min(props.maxWidth, v));
}
function clampH(v: number) {
  return Math.max(props.minHeight, Math.min(props.maxHeight, v));
}

function onMouseMove(e: MouseEvent) {
  if (_drag.value) {
    panelX.value = _drag.value.origX + (e.clientX - _drag.value.startX);
    panelY.value = _drag.value.origY + (e.clientY - _drag.value.startY);
    clampPosition();
    return;
  }
  if (!resizingEdge) return;
  const dx = e.clientX - rStartX;
  const dy = e.clientY - rStartY;
  const edge = resizingEdge;

  if (edge === 'right' || edge === 'corner-br' || edge === 'corner-tr') {
    width.value = clampW(rStartW + dx);
  }
  if (edge === 'bottom' || edge === 'corner-br' || edge === 'corner-bl') {
    height.value = clampH(rStartH + dy);
  }
  if (edge === 'left' || edge === 'corner-bl' || edge === 'corner-tl') {
    const newW = clampW(rStartW - dx);
    panelX.value = rStartPanelX + (rStartW - newW);
    width.value = newW;
  }
  if (edge === 'top' || edge === 'corner-tr' || edge === 'corner-tl') {
    const newH = clampH(rStartH - dy);
    panelY.value = rStartPanelY + (rStartH - newH);
    height.value = newH;
  }
}

function onMouseUp(e: MouseEvent) {
  if (_drag.value) {
    emit('drag-end', e.clientX, e.clientY);
    _drag.value = null;
    persistNow();
  }
  if (resizingEdge) {
    resizingEdge = null;
    persistNow();
  }
}

const panelStyle = computed(() => ({
  position: 'fixed' as const,
  left: panelX.value + 'px',
  top: panelY.value + 'px',
  width: width.value + 'px',
  height: height.value + 'px',
  zIndex: props.zIndex,
  pointerEvents: (_drag.value ? 'none' : 'auto') as 'none' | 'auto',
}));
</script>

<template>
  <Teleport to="body">
    <div
      class="flex flex-col rounded-2xl overflow-hidden"
      :style="panelStyle"
      @mousedown="emit('focus')"
      style="
        background: rgba(10, 10, 16, 0.85);
        backdrop-filter: blur(28px) saturate(160%);
        -webkit-backdrop-filter: blur(28px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.07);
        box-shadow:
          0 24px 64px rgba(0, 0, 0, 0.6),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      "
    >
      <div
        class="flex flex-shrink-0 items-center gap-3 px-4 py-2.5 cursor-grab active:cursor-grabbing select-none"
        style="border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
        @mousedown="onHandleMousedown"
      >
        <div class="flex gap-1.5" data-no-drag>
          <button
            class="h-3 w-3 rounded-full transition-opacity hover:opacity-75"
            style="background: #ef4444"
            title="Fermer"
            @click="emit('close')"
          />
          <div class="h-3 w-3 rounded-full" style="background: rgba(255, 255, 255, 0.08)" />
          <div class="h-3 w-3 rounded-full" style="background: rgba(255, 255, 255, 0.08)" />
        </div>
        <span class="text-xs font-semibold truncate flex-1" style="color: rgba(255, 255, 255, 0.5)">
          {{ title }}
        </span>
        <div data-no-drag>
          <slot name="header-actions" />
        </div>
      </div>

      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <slot />
      </div>

      <div
        class="absolute top-9 left-0 w-1 bottom-3 cursor-ew-resize"
        @mousedown="startResize('left', $event)"
      />
      <div
        class="absolute top-9 right-0 w-1 bottom-3 cursor-ew-resize"
        @mousedown="startResize('right', $event)"
      />
      <div
        class="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize"
        @mousedown="startResize('bottom', $event)"
      />
      <div
        class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        @mousedown="startResize('corner-br', $event)"
      />
      <div
        class="absolute bottom-0 left-0 h-4 w-4 cursor-nesw-resize"
        @mousedown="startResize('corner-bl', $event)"
      />
    </div>
  </Teleport>
</template>
