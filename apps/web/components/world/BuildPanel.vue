<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BuildTool } from './NookScene';
import {
  DECOR_CATALOG,
  DECOR_CATEGORY_LABELS,
  DECOR_CATEGORY_ORDER,
  type DecorAsset,
  type DecorCategory,
} from './scene/decor-catalog';
import { FLOOR_CATALOG_GROUPS, type FloorAsset } from './scene/floor-catalog';
import { useDraggablePanel } from '~/composables/useDraggablePanel';
import BuildWallPicker from './BuildWallPicker.vue';

const ROOM_CUSTOM_TEMPLATE_ID = 'custom';

const props = defineProps<{
  tool: BuildTool;
  isSaving?: boolean;
  selectedDecor?: string | null;
  selectedFloor?: string;
  selectedWallFrame?: number;
  selectedRoomTemplate?: string;
}>();

const emit = defineEmits<{
  'update:tool': [tool: BuildTool];
  'update:selected-decor': [asset: string | null];
  'update:selected-floor': [asset: string];
  'update:selected-wall-frame': [frame: number];
  'update:selected-room-template': [id: string];
  close: [];
}>();

const panel = ref<HTMLElement | null>(null);
const { panelStyle, onHandleMousedown } = useDraggablePanel({ panelEl: panel });

const decorCategories = DECOR_CATEGORY_ORDER;

const decorByCategory = computed<Record<DecorCategory, DecorAsset[]>>(() => {
  const groups: Record<DecorCategory, DecorAsset[]> = {
    nature: [],
    construction: [],
    office: [],
    props: [],
  };
  for (const asset of DECOR_CATALOG) groups[asset.category].push(asset);
  return groups;
});

const firstNonEmptyCategory = (): DecorCategory => {
  for (const cat of decorCategories) {
    if (decorByCategory.value[cat].length) return cat;
  }
  return 'nature';
};

const activeCategory = ref<DecorCategory>(firstNonEmptyCategory());

watch(
  () => [props.tool, props.selectedRoomTemplate] as const,
  ([tool, selectedRoomTemplate]) => {
    if (tool === 'decor' && !props.selectedDecor) {
      const first = decorByCategory.value[activeCategory.value]?.[0];
      if (first) emit('update:selected-decor', first.id);
    }
    if (tool === 'room' && selectedRoomTemplate !== ROOM_CUSTOM_TEMPLATE_ID) {
      emit('update:selected-room-template', ROOM_CUSTOM_TEMPLATE_ID);
    }
  },
  { immediate: true },
);

function pickDecor(asset: DecorAsset) {
  emit('update:selected-decor', asset.id);
}

function pickFloor(asset: FloorAsset) {
  emit('update:selected-floor', asset.id);
}
</script>

<template>
  <div ref="panel" :style="panelStyle" class="z-50 w-[23rem] select-none">
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

      <div class="grid grid-cols-3 gap-1.5 p-2.5" @mousedown.stop>
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
          <span class="text-[10px] font-medium leading-none">Sol</span>
        </button>

        <button
          class="flex flex-col items-center gap-1 rounded-xl py-3 transition-all duration-150"
          :style="
            tool === 'wall' || tool === 'room'
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

        <button
          class="flex flex-col items-center gap-1 rounded-xl py-3 transition-all duration-150"
          :style="
            tool === 'decor'
              ? 'background:rgba(99,102,241,0.2);color:rgb(165,180,252)'
              : 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.45)'
          "
          @click="emit('update:tool', 'decor')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
            />
          </svg>
          <span class="text-[10px] font-medium leading-none">Décor</span>
        </button>
      </div>

      <div v-if="tool === 'tile'" class="px-2.5 pb-2.5" @mousedown.stop>
        <div
          class="max-h-80 overflow-y-auto rounded-lg p-1.5"
          style="background: rgba(0, 0, 0, 0.25)"
        >
          <section v-for="group in FLOOR_CATALOG_GROUPS" :key="group.id" class="mb-2 last:mb-0">
            <p class="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
              {{ group.label }}
            </p>
            <div class="grid grid-cols-5 gap-1.5">
              <button
                v-for="asset in group.assets"
                :key="asset.id"
                class="aspect-square rounded-md flex items-center justify-center overflow-hidden transition-all"
                :style="
                  selectedFloor === asset.id
                    ? 'background:rgba(99,102,241,0.35);box-shadow:inset 0 0 0 1.5px rgba(165,180,252,0.9)'
                    : 'background:rgba(255,255,255,0.04)'
                "
                :title="asset.label"
                @click="pickFloor(asset)"
              >
                <span v-if="!asset.url" class="block w-full h-full" style="background: #f3ead4" />
                <img
                  v-else
                  :src="asset.url"
                  :alt="asset.label"
                  class="w-full h-full object-cover"
                  style="image-rendering: pixelated"
                  draggable="false"
                />
              </button>
            </div>
          </section>
        </div>

        <p class="mt-2 text-[10px] leading-tight" style="color: rgba(255, 255, 255, 0.35)">
          Glisse pour peindre le sol choisi. Re-glisse sur le même sol pour le retirer.
        </p>
      </div>

      <BuildWallPicker
        v-if="tool === 'wall' || tool === 'room'"
        :tool="tool"
        :selected-wall-frame="selectedWallFrame"
        @update:selected-wall-frame="emit('update:selected-wall-frame', $event)"
        @update:selected-room-template="emit('update:selected-room-template', $event)"
        @update:tool="emit('update:tool', $event)"
      />

      <div v-if="tool === 'decor'" class="px-2.5 pb-2.5" @mousedown.stop>
        <div class="flex gap-1 mb-2 overflow-x-auto pb-0.5">
          <button
            v-for="cat in decorCategories"
            :key="cat"
            class="shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors"
            :style="
              activeCategory === cat
                ? 'background:rgba(99,102,241,0.18);color:rgb(199,210,254)'
                : 'background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.45)'
            "
            @click="activeCategory = cat"
          >
            {{ DECOR_CATEGORY_LABELS[cat] }}
          </button>
        </div>

        <div
          class="grid grid-cols-5 gap-1.5 max-h-80 overflow-y-auto rounded-lg p-1.5"
          style="background: rgba(0, 0, 0, 0.25)"
        >
          <button
            v-for="asset in decorByCategory[activeCategory]"
            :key="asset.id"
            class="aspect-square rounded-md flex items-center justify-center transition-all"
            :style="
              selectedDecor === asset.id
                ? 'background:rgba(99,102,241,0.35);box-shadow:inset 0 0 0 1.5px rgba(165,180,252,0.9)'
                : 'background:rgba(255,255,255,0.04)'
            "
            :title="asset.label"
            @click="pickDecor(asset)"
          >
            <img
              :src="asset.primary.file"
              :alt="asset.label"
              class="w-full h-full object-contain"
              style="image-rendering: pixelated"
              draggable="false"
            />
          </button>
        </div>

        <p class="mt-2 text-[10px] leading-tight" style="color: rgba(255, 255, 255, 0.35)">
          Clique pour poser. Clique sur un décor existant pour le retirer.
        </p>
      </div>
    </div>
  </div>
</template>
