<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue';
import { WALL_SHEET } from './scene/wall-catalog';

export interface WallRegion {
  col: number;
  row: number;
  w: number;
  h: number;
}

const props = defineProps<{
  selectedWallRegion?: WallRegion;
}>();

const emit = defineEmits<{
  'update:selected-wall-region': [region: WallRegion];
}>();

const SHEET_URL = WALL_SHEET.url;
const SHEET_COLS = WALL_SHEET.cols;
const SHEET_ROWS = WALL_SHEET.rows;
const TILE_PX = 32;
const DISPLAY_TILE = 24;

const activeRegion = computed<WallRegion>(
  () => props.selectedWallRegion ?? { col: 0, row: 0, w: 1, h: 1 },
);

const sheetStyle: CSSProperties = {
  width: `${SHEET_COLS * DISPLAY_TILE}px`,
  height: `${SHEET_ROWS * DISPLAY_TILE}px`,
  backgroundImage: `url(${SHEET_URL})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: `${SHEET_COLS * DISPLAY_TILE}px auto`,
  imageRendering: 'pixelated',
  cursor: 'crosshair',
};

const gridOverlayStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
  backgroundSize: `${DISPLAY_TILE}px ${DISPLAY_TILE}px`,
};

const regionHighlightStyle = computed<CSSProperties>(() => {
  const r = activeRegion.value;
  return {
    left: `${r.col * DISPLAY_TILE}px`,
    top: `${r.row * DISPLAY_TILE}px`,
    width: `${r.w * DISPLAY_TILE}px`,
    height: `${r.h * DISPLAY_TILE}px`,
    boxShadow: 'inset 0 0 0 2px rgba(255,238,88,0.95)',
    background: 'rgba(255,238,88,0.15)',
  };
});

// --- drag selection ---
const dragStart = ref<{ col: number; row: number } | null>(null);
const dragCurrent = ref<{ col: number; row: number } | null>(null);

const dragPreviewStyle = computed<CSSProperties | null>(() => {
  if (!dragStart.value || !dragCurrent.value) return null;
  const col1 = Math.min(dragStart.value.col, dragCurrent.value.col);
  const col2 = Math.max(dragStart.value.col, dragCurrent.value.col);
  const row1 = Math.min(dragStart.value.row, dragCurrent.value.row);
  const row2 = Math.max(dragStart.value.row, dragCurrent.value.row);
  return {
    left: `${col1 * DISPLAY_TILE}px`,
    top: `${row1 * DISPLAY_TILE}px`,
    width: `${(col2 - col1 + 1) * DISPLAY_TILE}px`,
    height: `${(row2 - row1 + 1) * DISPLAY_TILE}px`,
    boxShadow: 'inset 0 0 0 2px rgba(99,102,241,0.95)',
    background: 'rgba(99,102,241,0.18)',
  };
});

function cellFromEvent(ev: MouseEvent): { col: number; row: number } | null {
  const target = (ev.currentTarget as HTMLElement).querySelector('.sheet-inner');
  if (!target) return null;
  const rect = (target as HTMLElement).getBoundingClientRect();
  const localX = ev.clientX - rect.left;
  const localY = ev.clientY - rect.top;
  const col = Math.floor(localX / DISPLAY_TILE);
  const row = Math.floor(localY / DISPLAY_TILE);
  if (col < 0 || col >= SHEET_COLS || row < 0 || row >= SHEET_ROWS) return null;
  return { col, row };
}

function onMouseDown(ev: MouseEvent) {
  const cell = cellFromEvent(ev);
  if (!cell) return;
  dragStart.value = cell;
  dragCurrent.value = cell;
}

function onMouseMove(ev: MouseEvent) {
  if (!dragStart.value) return;
  const cell = cellFromEvent(ev);
  if (!cell) return;
  dragCurrent.value = cell;
}

function onMouseUp(ev: MouseEvent) {
  if (!dragStart.value) return;
  const cell = cellFromEvent(ev) ?? dragCurrent.value;
  if (!cell) {
    dragStart.value = null;
    dragCurrent.value = null;
    return;
  }
  const col1 = Math.min(dragStart.value.col, cell.col);
  const col2 = Math.max(dragStart.value.col, cell.col);
  const row1 = Math.min(dragStart.value.row, cell.row);
  const row2 = Math.max(dragStart.value.row, cell.row);
  emit('update:selected-wall-region', {
    col: col1,
    row: row1,
    w: col2 - col1 + 1,
    h: row2 - row1 + 1,
  });
  dragStart.value = null;
  dragCurrent.value = null;
}

// Big preview of the selected region (scaled to fit).
const previewStyle = computed<CSSProperties>(() => {
  const r = activeRegion.value;
  const PREVIEW_MAX = 144;
  const scale = Math.min(PREVIEW_MAX / (r.w * TILE_PX), PREVIEW_MAX / (r.h * TILE_PX), 4);
  return {
    width: `${r.w * TILE_PX * scale}px`,
    height: `${r.h * TILE_PX * scale}px`,
    backgroundImage: `url(${SHEET_URL})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${SHEET_COLS * TILE_PX * scale}px auto`,
    backgroundPosition: `-${r.col * TILE_PX * scale}px -${r.row * TILE_PX * scale}px`,
    imageRendering: 'pixelated',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
  };
});
</script>

<template>
  <div class="px-2.5 pb-2.5 flex flex-col gap-2" @mousedown.stop>
    <div
      class="flex items-center gap-3 rounded-md px-2 py-2"
      style="background: rgba(255, 255, 255, 0.04)"
    >
      <div :style="previewStyle" />
      <div class="flex flex-col gap-1 text-[10px]">
        <span class="font-semibold uppercase tracking-wide text-ink-muted">Brush sélectionnée</span>
        <span class="text-ink"
          >({{ activeRegion.col }}, {{ activeRegion.row }}) — {{ activeRegion.w }}×{{
            activeRegion.h
          }}</span
        >
        <span class="text-ink-faint">Clique ou drag dans la sheet ↓</span>
      </div>
    </div>
    <div
      class="overflow-auto rounded-md select-none"
      style="background: rgba(0, 0, 0, 0.3); max-height: 360px"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div class="sheet-inner relative" :style="sheetStyle">
        <div class="absolute inset-0 pointer-events-none" :style="gridOverlayStyle" />
        <div class="absolute pointer-events-none" :style="regionHighlightStyle" />
        <div
          v-if="dragPreviewStyle"
          class="absolute pointer-events-none"
          :style="dragPreviewStyle"
        />
      </div>
    </div>
    <p class="text-[10px] leading-tight" style="color: var(--ink-faint)">
      Click+drag pour sélectionner un bloc de tuiles. Drag sur la map pour le tiler dedans.
    </p>
  </div>
</template>
