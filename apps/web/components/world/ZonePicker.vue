<script setup lang="ts">
import type Phaser from 'phaser';
import { DISPLAY_SCALE } from './scene/constants';

const props = defineProps<{
  game: Phaser.Game | null;
}>();

const emit = defineEmits<{
  'zone-picked': [zone: { x: number; y: number; w: number; h: number }];
  'zone-cancel': [];
}>();

const drag = ref<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

function onMousedown(ev: MouseEvent) {
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  drag.value = {
    startX: ev.clientX - rect.left,
    startY: ev.clientY - rect.top,
    curX: ev.clientX - rect.left,
    curY: ev.clientY - rect.top,
  };
}

function onMousemove(ev: MouseEvent) {
  if (!drag.value) return;
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  drag.value = { ...drag.value, curX: ev.clientX - rect.left, curY: ev.clientY - rect.top };
}

function onMouseup(ev: MouseEvent) {
  if (!drag.value) return;
  const el = ev.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const endX = ev.clientX - rect.left;
  const endY = ev.clientY - rect.top;
  const startX = drag.value.startX;
  const startY = drag.value.startY;
  drag.value = null;
  if (Math.abs(endX - startX) < 20 || Math.abs(endY - startY) < 20) return;

  const scene = props.game?.scene.scenes[0] as
    | { cameras: { main: Phaser.Cameras.Scene2D.Camera } }
    | undefined;
  if (!scene) return;

  // screen px → world coords, inverse of projectToScreen
  const cam = scene.cameras.main;
  const k = cam.zoom * DISPLAY_SCALE;
  const wx1 = startX / k + cam.scrollX;
  const wy1 = startY / k + cam.scrollY;
  const wx2 = endX / k + cam.scrollX;
  const wy2 = endY / k + cam.scrollY;

  emit('zone-picked', {
    x: Math.round(Math.min(wx1, wx2)),
    y: Math.round(Math.min(wy1, wy2)),
    w: Math.round(Math.abs(wx2 - wx1)),
    h: Math.round(Math.abs(wy2 - wy1)),
  });
}

const dragRect = computed(() => {
  if (!drag.value) return null;
  return {
    left: Math.min(drag.value.startX, drag.value.curX),
    top: Math.min(drag.value.startY, drag.value.curY),
    width: Math.abs(drag.value.curX - drag.value.startX),
    height: Math.abs(drag.value.curY - drag.value.startY),
  };
});
</script>

<template>
  <div
    class="absolute inset-0 z-50 cursor-crosshair select-none"
    style="background: rgba(99, 102, 241, 0.08); border: 2px dashed rgba(99, 102, 241, 0.5)"
    tabindex="0"
    @mousedown="onMousedown"
    @mousemove="onMousemove"
    @mouseup="onMouseup"
    @keydown.esc="emit('zone-cancel')"
  >
    <div
      class="absolute top-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2 text-xs font-medium pointer-events-none"
      style="
        background: var(--surface-strong);
        color: var(--ink-soft);
        border: 1px solid rgba(99, 102, 241, 0.4);
      "
    >
      Glisse pour définir la zone vocale · Échap pour annuler
    </div>

    <button
      class="absolute top-4 right-4 rounded-xl px-3 py-1.5 text-xs font-medium"
      style="
        background: var(--surface-strong);
        color: var(--ink-muted);
        border: 1px solid var(--surface-tinted);
      "
      @click.stop="emit('zone-cancel')"
    >
      Annuler
    </button>

    <div
      v-if="dragRect"
      class="absolute pointer-events-none"
      :style="{
        left: dragRect.left + 'px',
        top: dragRect.top + 'px',
        width: dragRect.width + 'px',
        height: dragRect.height + 'px',
        background: 'rgba(99,102,241,0.15)',
        border: '2px solid rgba(99,102,241,0.8)',
        borderRadius: '4px',
      }"
    />
  </div>
</template>
