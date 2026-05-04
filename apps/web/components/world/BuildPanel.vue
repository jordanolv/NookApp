<script setup lang="ts">
import type { BuildTool } from './NookScene';

defineProps<{
  tool: BuildTool;
  isSaving?: boolean;
}>();

const emit = defineEmits<{
  'update:tool': [tool: BuildTool];
  close: [];
}>();

const panel = ref<HTMLElement | null>(null);
const panelX = ref(0);
const panelY = ref(16);
const initialized = ref(false);

const panelStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${panelY.value}px`,
  left: `${panelX.value}px`,
}));

let isDragging = false;
let startMouseX = 0;
let startMouseY = 0;
let startPanelX = 0;
let startPanelY = 0;

function onHandleMousedown(e: MouseEvent) {
  isDragging = true;
  startMouseX = e.clientX;
  startMouseY = e.clientY;
  startPanelX = panelX.value;
  startPanelY = panelY.value;
  e.preventDefault();
}

function onMousemove(e: MouseEvent) {
  if (!isDragging || !panel.value) return;
  const rect = panel.value.getBoundingClientRect();
  panelX.value = Math.max(
    4,
    Math.min(startPanelX + (e.clientX - startMouseX), window.innerWidth - rect.width - 4),
  );
  panelY.value = Math.max(
    4,
    Math.min(startPanelY + (e.clientY - startMouseY), window.innerHeight - rect.height - 4),
  );
}

function onMouseup() {
  isDragging = false;
}

onMounted(() => {
  if (!initialized.value && panel.value) {
    panelX.value = Math.round(window.innerWidth / 2 - panel.value.offsetWidth / 2);
    initialized.value = true;
  }
  window.addEventListener('mousemove', onMousemove);
  window.addEventListener('mouseup', onMouseup);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMousemove);
  window.removeEventListener('mouseup', onMouseup);
});
</script>

<template>
  <div ref="panel" :style="panelStyle" class="z-50 w-72 select-none">
    <div
      class="rounded-2xl overflow-hidden"
      style="
        background: rgba(15, 15, 20, 0.78);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      "
    >
      <!-- Header (drag handle) -->
      <div
        class="flex items-center gap-2 px-3 pt-2.5 pb-2 cursor-grab active:cursor-grabbing"
        @mousedown="onHandleMousedown"
      >
        <span class="text-indigo-300 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22 9l-3.39-.34-1.46-3.15-2.91 1.81L11 6l-1.24 3.32-2.91-1.81L5.39 10.66 2 11l1.81 2.91L2 16.83l3.39.34 1.46 3.15 2.91-1.81L11 22l1.24-3.32 2.91 1.81 1.46-3.15L22 17l-1.81-2.91z"
            />
          </svg>
        </span>
        <p class="flex-1 text-xs font-semibold text-indigo-300">Mode build</p>
        <span v-if="isSaving" class="h-1.5 w-1.5 rounded-full bg-amber-400" title="Sauvegarde…" />
        <button
          class="rounded-lg p-1 transition-colors"
          style="color: rgba(255, 255, 255, 0.4)"
          title="Fermer"
          @mousedown.stop
          @mouseenter="($event.currentTarget as HTMLElement).style.color = 'rgb(248,113,113)'"
          @mouseleave="($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'"
          @click="emit('close')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>

      <div style="height: 1px; margin: 0 12px; background: rgba(255, 255, 255, 0.06)" />

      <!-- Tool selector -->
      <div class="grid grid-cols-2 gap-1.5 p-2.5" @mousedown.stop>
        <button
          class="flex flex-col items-center gap-1 rounded-xl py-3 transition-all duration-150"
          :style="
            tool === 'tile'
              ? 'background:rgba(99,102,241,0.2);color:rgb(165,180,252)'
              : 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.45)'
          "
          @click="emit('update:tool', 'tile')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3z" />
          </svg>
          <span class="text-[10px] font-medium leading-none">Dalle</span>
        </button>

        <button
          class="flex flex-col items-center gap-1 rounded-xl py-3 transition-all duration-150"
          :style="
            tool === 'wall'
              ? 'background:rgba(99,102,241,0.2);color:rgb(165,180,252)'
              : 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.45)'
          "
          @click="emit('update:tool', 'wall')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 4h18v4H3zm0 6h6v4H3zm8 0h10v4H11zm-8 6h12v4H3zm14 0h4v4h-4z" />
          </svg>
          <span class="text-[10px] font-medium leading-none">Mur</span>
        </button>
      </div>

      <!-- Hint -->
      <p class="px-3 pb-2.5 text-[10px] leading-tight" style="color: rgba(255, 255, 255, 0.35)">
        {{
          tool === 'tile'
            ? "Glisse pour peindre une zone. Démarre sur l'herbe pour ajouter, sur une dalle pour retirer."
            : 'Glisse pour poser des murs. Démarre sur un mur existant pour le retirer.'
        }}
      </p>
    </div>
  </div>
</template>
