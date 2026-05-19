<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { BuildTool } from './NookScene';
import {
  DECOR_CATALOG,
  DECOR_CATEGORY_LABELS,
  DECOR_CATEGORY_ORDER,
  type DecorAsset,
  type DecorCategory,
} from './scene/decor-catalog';
import { FLOOR_CATALOG_GROUPS, type FloorAsset } from './scene/floor-catalog';
import {
  DEFAULT_WALL_FRAME,
  WALL_SHEET,
  WALL_SHEET_FRAMES,
  WALL_THEMES,
  normalizeWallFrame,
  stampRoomCells,
  themeOfFrame,
  type RoomStampCell,
  type WallThemeBlock,
} from './scene/wall-catalog';

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

// ── Decor picker ──────────────────────────────────────────────────────
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

const activeFrame = computed(() =>
  normalizeWallFrame(props.selectedWallFrame ?? DEFAULT_WALL_FRAME),
);
const activeTheme = computed(() => themeOfFrame(activeFrame.value));

const themeCellPx = 28;
const themeStripWidth = WALL_SHEET.themeWidth * themeCellPx;
const themeStripHeight = WALL_SHEET.themeHeight * themeCellPx;
const sheetPxWidth = WALL_SHEET.cols * themeCellPx;
const roomPreviewCellPx = 20;
const roomPreviewSize = 5;

function textureCellStyle(frame: number, cellPx: number): CSSProperties {
  const col = frame % WALL_SHEET.cols;
  const row = Math.floor(frame / WALL_SHEET.cols);
  return {
    backgroundImage: `url(${WALL_SHEET.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${WALL_SHEET.cols * cellPx}px auto`,
    backgroundPosition: `-${col * cellPx}px -${row * cellPx}px`,
    imageRendering: 'pixelated',
  };
}

function roomPreviewCellStyle(cell: RoomStampCell): CSSProperties {
  return {
    left: `${cell.x * roomPreviewCellPx}px`,
    top: `${cell.y * roomPreviewCellPx}px`,
    width: `${roomPreviewCellPx}px`,
    height: `${roomPreviewCellPx}px`,
    ...textureCellStyle(cell.frame, roomPreviewCellPx),
  };
}

function roomPreviewFloorCells() {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 2; y < roomPreviewSize - 1; y += 1) {
    for (let x = 1; x < roomPreviewSize - 1; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

function roomPreviewFloorStyle(cell: { x: number; y: number }): CSSProperties {
  return {
    left: `${cell.x * roomPreviewCellPx}px`,
    top: `${cell.y * roomPreviewCellPx}px`,
    width: `${roomPreviewCellPx}px`,
    height: `${roomPreviewCellPx}px`,
    background: 'rgba(8,8,12,0.78)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
  };
}

function roomPreviewCells(theme: WallThemeBlock) {
  return stampRoomCells(0, 0, roomPreviewSize, roomPreviewSize, theme);
}

function pickThemeForRoom(theme: WallThemeBlock) {
  emit('update:selected-wall-frame', (theme.row + 1) * WALL_SHEET.cols + theme.col + 1);
  enableRoomMode();
}

function themeBgOffset(themeCol: number, themeRow: number) {
  return `-${themeCol * themeCellPx}px -${themeRow * themeCellPx}px`;
}

function frameInTheme(frame: number, theme: { col: number; row: number }) {
  const col = frame % WALL_SHEET.cols;
  const row = Math.floor(frame / WALL_SHEET.cols);
  if (
    col < theme.col ||
    col >= theme.col + WALL_SHEET.themeWidth ||
    row < theme.row ||
    row >= theme.row + WALL_SHEET.themeHeight
  )
    return null;
  return { col: col - theme.col, row: row - theme.row };
}

function onThemeStripClick(ev: MouseEvent, theme: { col: number; row: number }) {
  const target = ev.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const localX = ev.clientX - rect.left;
  const localY = ev.clientY - rect.top;
  const cx = Math.floor(localX / themeCellPx);
  const cy = Math.floor(localY / themeCellPx);
  if (cx < 0 || cy < 0 || cx >= WALL_SHEET.themeWidth || cy >= WALL_SHEET.themeHeight) return;
  const frame = (theme.row + cy) * WALL_SHEET.cols + (theme.col + cx);
  if (frame < 0 || frame >= WALL_SHEET_FRAMES) return;
  emit('update:selected-wall-frame', frame);
}

function enableRoomMode() {
  emit('update:selected-room-template', ROOM_CUSTOM_TEMPLATE_ID);
  emit('update:tool', 'room');
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

      <div v-if="tool === 'wall' || tool === 'room'" class="px-2.5 pb-2.5" @mousedown.stop>
        <div
          class="max-h-80 overflow-y-auto rounded-lg p-2 flex flex-col gap-2"
          style="background: rgba(0, 0, 0, 0.25)"
        >
          <div
            v-for="(theme, idx) in WALL_THEMES"
            :key="idx"
            class="rounded-lg p-2"
            :style="{
              boxShadow:
                activeTheme.col === theme.col && activeTheme.row === theme.row
                  ? 'inset 0 0 0 1.5px rgba(165,180,252,0.9)'
                  : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              background:
                activeTheme.col === theme.col && activeTheme.row === theme.row
                  ? 'rgba(99,102,241,0.13)'
                  : 'rgba(255,255,255,0.035)',
            }"
          >
            <div class="mb-2 flex items-center gap-2">
              <button
                class="relative shrink-0 rounded-md overflow-hidden transition-transform active:scale-[0.98]"
                :style="{
                  width: `${roomPreviewSize * roomPreviewCellPx}px`,
                  height: `${roomPreviewSize * roomPreviewCellPx}px`,
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), rgba(255,255,255,0.035)',
                  backgroundSize: `${roomPreviewCellPx}px ${roomPreviewCellPx}px`,
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                }"
                title="Créer une room avec ce thème"
                @click="pickThemeForRoom(theme)"
              >
                <span
                  v-for="cell in roomPreviewFloorCells()"
                  :key="`floor-${cell.x},${cell.y}`"
                  class="absolute block"
                  :style="roomPreviewFloorStyle(cell)"
                />
                <span
                  v-for="cell in roomPreviewCells(theme)"
                  :key="`${cell.x},${cell.y},${cell.frame}`"
                  class="absolute block"
                  :style="roomPreviewCellStyle(cell)"
                />
              </button>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-white/45">
                  Preview room
                </p>
                <p class="mt-1 text-[10px] leading-tight text-white/30">
                  Clique la miniature pour créer une room avec ce thème.
                </p>
              </div>
            </div>

            <div
              class="relative cursor-pointer rounded-md overflow-hidden"
              :style="{
                width: `${themeStripWidth}px`,
                height: `${themeStripHeight}px`,
              }"
              @click="onThemeStripClick($event, theme)"
            >
              <div
                :style="{
                  backgroundImage: `url(${WALL_SHEET.url})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${sheetPxWidth}px auto`,
                  backgroundPosition: themeBgOffset(theme.col, theme.row),
                  imageRendering: 'pixelated',
                  width: `${themeStripWidth}px`,
                  height: `${themeStripHeight}px`,
                }"
              />
              <div
                class="absolute inset-0 pointer-events-none"
                :style="{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.13) 1px, transparent 1px)',
                  backgroundSize: `${themeCellPx}px ${themeCellPx}px`,
                }"
              />
              <div
                v-if="frameInTheme(activeFrame, theme)"
                class="absolute pointer-events-none"
                :style="{
                  left: `${frameInTheme(activeFrame, theme)!.col * themeCellPx}px`,
                  top: `${frameInTheme(activeFrame, theme)!.row * themeCellPx}px`,
                  width: `${themeCellPx}px`,
                  height: `${themeCellPx}px`,
                  boxShadow: 'inset 0 0 0 2px rgba(255,238,88,0.95)',
                  background: 'rgba(255,238,88,0.18)',
                }"
              />
            </div>
          </div>
        </div>

        <p
          v-if="tool === 'room'"
          class="mt-2 text-[10px] leading-tight"
          style="color: rgba(255, 255, 255, 0.35)"
        >
          Glisse un rectangle sur la map. Clique Mur pour revenir à la pose case par case.
        </p>
        <p v-else class="mt-2 text-[10px] leading-tight" style="color: rgba(255, 255, 255, 0.35)">
          Clique une miniature pour créer une room avec ce thème, ou clique une tuile pour poser des
          murs case par case.
        </p>
      </div>

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
