<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
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
  tool: 'wall' | 'room' | string;
  selectedWallFrame?: number;
  selectedRoomTheme?: WallThemeBlock;
}>();

const emit = defineEmits<{
  'update:selected-wall-frame': [frame: number];
  'update:selected-room-theme': [theme: WallThemeBlock];
  'update:selected-room-template': [id: string];
  'update:tool': [tool: 'wall' | 'room'];
}>();

const themeCellPx = 28;
const themeStripWidth = WALL_SHEET.themeWidth * themeCellPx;
const themeStripHeight = WALL_SHEET.themeHeight * themeCellPx;
const sheetPxWidth = WALL_SHEET.cols * themeCellPx;
const roomPreviewCellPx = 20;
const roomPreviewSize = 5;

const activeFrame = computed(() =>
  normalizeWallFrame(props.selectedWallFrame ?? DEFAULT_WALL_FRAME),
);
const activeWallTheme = computed(() => themeOfFrame(activeFrame.value));
const activeRoomTheme = computed<WallThemeBlock>(
  () => props.selectedRoomTheme ?? themeOfFrame(DEFAULT_WALL_FRAME),
);

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
  // Interior spans y=2..h-1 because stampRoomCells renders an extra row below
  // for the front wall's offset; the preview mirrors that.
  for (let y = 2; y <= roomPreviewSize - 1; y += 1) {
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
  emit('update:selected-room-theme', { col: theme.col, row: theme.row });
  emit('update:selected-room-template', ROOM_CUSTOM_TEMPLATE_ID);
  emit('update:tool', 'room');
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
  if (props.tool !== 'wall') emit('update:tool', 'wall');
}
</script>

<template>
  <div class="px-2.5 pb-2.5" @mousedown.stop>
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
            (tool === 'wall' &&
              activeWallTheme.col === theme.col &&
              activeWallTheme.row === theme.row) ||
            (tool === 'room' &&
              activeRoomTheme.col === theme.col &&
              activeRoomTheme.row === theme.row)
              ? 'inset 0 0 0 1.5px rgba(165,180,252,0.9)'
              : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          background:
            (tool === 'wall' &&
              activeWallTheme.col === theme.col &&
              activeWallTheme.row === theme.row) ||
            (tool === 'room' &&
              activeRoomTheme.col === theme.col &&
              activeRoomTheme.row === theme.row)
              ? 'rgba(99,102,241,0.13)'
              : 'rgba(255,255,255,0.035)',
        }"
      >
        <div class="mb-2 flex items-center gap-2">
          <button
            class="relative shrink-0 rounded-md overflow-hidden transition-transform active:scale-[0.98]"
            :style="{
              width: `${roomPreviewSize * roomPreviewCellPx}px`,
              height: `${(roomPreviewSize + 1) * roomPreviewCellPx}px`,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), rgba(255,255,255,0.035)',
              backgroundSize: `${roomPreviewCellPx}px ${roomPreviewCellPx}px`,
              boxShadow:
                tool === 'room' &&
                activeRoomTheme.col === theme.col &&
                activeRoomTheme.row === theme.row
                  ? 'inset 0 0 0 2px rgba(165,180,252,0.95), 0 0 0 2px rgba(99,102,241,0.35)'
                  : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            }"
            title="Créer une pièce préfaite avec ce thème"
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
            <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Pièce préfaite
            </p>
            <p class="mt-1 text-[10px] leading-tight text-ink-faint">
              Clique la miniature pour créer une pièce avec ce thème.
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
            v-if="tool === 'wall' && frameInTheme(activeFrame, theme)"
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
      style="color: var(--ink-faint)"
    >
      Glisse un rectangle sur la map. Clique Mur pour revenir à la pose case par case.
    </p>
    <p v-else class="mt-2 text-[10px] leading-tight" style="color: var(--ink-faint)">
      Clique une miniature pour créer une pièce préfaite, ou clique une tuile pour poser des murs
      case par case.
    </p>
  </div>
</template>
