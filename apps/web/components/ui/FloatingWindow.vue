<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    bannerUrl?: string | null;
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
    showClose?: boolean;
    surface?: 'default' | 'rail';
    fitContent?: boolean;
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
    showClose: true,
    surface: 'default',
    fitContent: false,
  },
);

const layout = useUiLayout();

const emit = defineEmits<{
  close: [];
  focus: [];
  'drag-start': [];
  'drag-move': [x: number, y: number, width: number, height: number];
  'drag-end': [x: number, y: number, width: number, height: number];
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
    emit('drag-move', panelX.value, panelY.value, width.value, height.value);
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

function onMouseUp() {
  if (_drag.value) {
    emit('drag-end', panelX.value, panelY.value, width.value, height.value);
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
  width: props.fitContent ? 'max-content' : width.value + 'px',
  height: props.fitContent ? 'max-content' : height.value + 'px',
  zIndex: props.zIndex,
  pointerEvents: (_drag.value ? 'none' : 'auto') as 'none' | 'auto',
}));

const surfaceStyle = computed(() => {
  const blurAmount = props.surface === 'rail' ? '18px' : '28px';
  return {
    background: 'var(--surface-strong)',
    backdropFilter: `blur(${blurAmount}) saturate(1.5)`,
    WebkitBackdropFilter: `blur(${blurAmount}) saturate(1.5)`,
    border: '1px solid var(--surface-border)',
    boxShadow: 'var(--shadow-lift)',
    color: 'var(--ink)',
  };
});
</script>

<template>
  <Teleport to="body">
    <div
      class="flex flex-col rounded-2xl overflow-hidden"
      :style="[panelStyle, surfaceStyle]"
      @mousedown="emit('focus')"
    >
      <div
        class="flex flex-shrink-0 items-center gap-3 px-4 py-2.5 cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
        :style="{ borderBottom: '1px solid var(--surface-divider)' }"
        @mousedown="onHandleMousedown"
      >
        <img
          v-if="bannerUrl"
          :src="bannerUrl"
          aria-hidden="true"
          style="
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            opacity: 0.45;
            pointer-events: none;
          "
        />
        <span
          class="text-xs font-semibold truncate flex-1 relative"
          :style="{ color: 'var(--ink)' }"
        >
          {{ title }}
        </span>
        <div class="flex items-center gap-2 relative" data-no-drag>
          <slot name="header-actions" />
          <button
            v-if="showClose"
            class="flex h-5 w-5 items-center justify-center rounded transition-opacity hover:opacity-60"
            title="Réduire"
            @click="emit('close')"
          >
            <span class="block h-0.5 w-3 rounded-full" :style="{ background: 'var(--ink)' }" />
          </button>
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
        class="absolute top-0 left-8 right-8 h-1 cursor-ns-resize"
        @mousedown="startResize('top', $event)"
      />
      <div
        class="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize"
        @mousedown="startResize('bottom', $event)"
      />
      <div
        class="absolute top-0 right-0 h-4 w-4 cursor-nesw-resize"
        @mousedown="startResize('corner-tr', $event)"
      />
      <div
        class="absolute top-0 left-0 h-4 w-4 cursor-nwse-resize"
        @mousedown="startResize('corner-tl', $event)"
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
