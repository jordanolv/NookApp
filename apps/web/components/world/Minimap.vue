<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { MapData, ChannelPublic, VoiceParticipant, UiLayoutEntry } from '@nookapp/protocol';
import type { PresencePlayer } from '~/composables/usePresence';

const TILE_SIZE = 32;
const WORLD = 70;
const DEFAULT_ZOOM = 26;
const ZOOM_MIN = 8;
const ZOOM_MAX = 60;
const ZOOM_STEP = 4;
const SIZE = 180; // diameter in px
const STORAGE_KEY = 'world:minimap:pos';

const props = defineProps<{
  mapData: MapData | null;
  voiceChannels: ChannelPublic[];
  players: Map<string, PresencePlayer>;
  voiceMembers: Map<string, VoiceParticipant[]>;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentVoiceChannelId?: string | null;
}>();

const emit = defineEmits<{
  'teleport-to': [x: number, y: number];
}>();

const uiLayout = useUiLayout();
const hoveredZone = ref<string | null>(null);
const zoomTiles = ref<number>(DEFAULT_ZOOM);

// ── Position (persisted) ──
const pos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

function defaultPos(): { x: number; y: number } {
  if (!import.meta.client) return { x: 16, y: 16 };
  return { x: Math.max(16, window.innerWidth - SIZE - 16), y: 16 };
}

onMounted(() => {
  pos.value = defaultPos();
  void uiLayout.ensureLoaded().then(() => {
    const saved = uiLayout.get<{ x?: number; y?: number; zoom?: number }>(STORAGE_KEY);
    if (saved) {
      if (typeof saved.x === 'number' && typeof saved.y === 'number') {
        pos.value = clampToViewport(saved.x, saved.y);
      }
      if (typeof saved.zoom === 'number') {
        zoomTiles.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, saved.zoom));
      }
    }
  });
  window.addEventListener('resize', onWindowResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
});

function clampToViewport(x: number, y: number): { x: number; y: number } {
  if (!import.meta.client) return { x, y };
  return {
    x: Math.max(0, Math.min(window.innerWidth - SIZE, x)),
    y: Math.max(0, Math.min(window.innerHeight - SIZE, y)),
  };
}
function onWindowResize() {
  pos.value = clampToViewport(pos.value.x, pos.value.y);
}

function persistState() {
  uiLayout.set(STORAGE_KEY, {
    x: pos.value.x,
    y: pos.value.y,
    zoom: zoomTiles.value,
  } as unknown as UiLayoutEntry);
}

function zoomIn() {
  zoomTiles.value = Math.max(ZOOM_MIN, zoomTiles.value - ZOOM_STEP);
  persistState();
}
function zoomOut() {
  zoomTiles.value = Math.min(ZOOM_MAX, zoomTiles.value + ZOOM_STEP);
  persistState();
}

// ── Drag ──
const dragging = ref(false);
let dragStart = { px: 0, py: 0, mx: 0, my: 0, moved: false };

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement | null;
  // Don't start drag if the user clicked an interactive overlay (zone or zoom button).
  if (target?.closest('.zone-hit, .minimap__zoom-btn')) return;
  dragStart = { px: pos.value.x, py: pos.value.y, mx: e.clientX, my: e.clientY, moved: false };
  dragging.value = true;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}
function onPointerMove(e: PointerEvent) {
  const dx = e.clientX - dragStart.mx;
  const dy = e.clientY - dragStart.my;
  if (!dragStart.moved && dx * dx + dy * dy > 9) dragStart.moved = true;
  if (!dragStart.moved) return;
  pos.value = clampToViewport(dragStart.px + dx, dragStart.py + dy);
}
function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  dragging.value = false;
  if (dragStart.moved) persistState();
}

// ── Map data ──
const walls = computed(() => props.mapData?.items.filter((i) => i.type === 'wall') ?? []);
const zonedChannels = computed(() => props.voiceChannels.filter((c) => c.mapZone));
const playerList = computed(() => Array.from(props.players.values()));

const viewBoxStr = computed(() => {
  const me = props.currentUserId ? props.players.get(props.currentUserId) : null;
  const z = zoomTiles.value;
  if (!me) return `0 0 ${WORLD} ${WORLD}`;
  const cx = me.x / TILE_SIZE;
  const cy = me.y / TILE_SIZE;
  const half = z / 2;
  const x = Math.max(0, Math.min(WORLD - z, cx - half));
  const y = Math.max(0, Math.min(WORLD - z, cy - half));
  return `${x} ${y} ${z} ${z}`;
});

const augmentedVoiceMembers = computed(() => {
  const map = new Map(props.voiceMembers);
  if (props.currentVoiceChannelId && props.currentUserId) {
    const list = [...(map.get(props.currentVoiceChannelId) ?? [])];
    if (!list.some((p) => p.userId === props.currentUserId)) {
      list.push({
        userId: props.currentUserId,
        name: props.currentUserName ?? 'Vous',
        channelId: props.currentVoiceChannelId,
      });
      map.set(props.currentVoiceChannelId, list);
    }
  }
  return map;
});

function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}
function playerColor(userId: string): string {
  return `hsl(${hueFor(userId)}, 75%, 60%)`;
}
function membersOfZone(channelId: string): VoiceParticipant[] {
  return augmentedVoiceMembers.value.get(channelId) ?? [];
}

function onZoneClick(ch: ChannelPublic) {
  if (dragStart.moved) return; // ignore click that came after a drag
  if (!ch.mapZone) return;
  const cx = ch.mapZone.x + ch.mapZone.w / 2;
  const cy = ch.mapZone.y + ch.mapZone.h / 2;
  emit('teleport-to', cx, cy);
}
</script>

<template>
  <div
    class="minimap"
    :class="{ 'minimap--dragging': dragging }"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${SIZE}px`, height: `${SIZE}px` }"
    @pointerdown="onPointerDown"
  >
    <svg class="minimap__svg" :viewBox="viewBoxStr" preserveAspectRatio="xMidYMid meet">
      <!-- Floor tiles -->
      <rect
        v-for="(t, i) in mapData?.tiles ?? []"
        :key="`t${i}`"
        :x="t[0]"
        :y="t[1]"
        width="1"
        height="1"
        fill="rgba(243, 234, 212, 0.5)"
      />

      <!-- Walls -->
      <rect
        v-for="(w, i) in walls"
        :key="`w${i}`"
        :x="w.x"
        :y="w.y"
        width="1"
        height="1"
        fill="rgba(40, 40, 50, 0.95)"
      />

      <!-- Voice zones -->
      <g v-for="ch in zonedChannels" :key="ch.id">
        <rect
          :x="ch.mapZone!.x / TILE_SIZE"
          :y="ch.mapZone!.y / TILE_SIZE"
          :width="ch.mapZone!.w / TILE_SIZE"
          :height="ch.mapZone!.h / TILE_SIZE"
          class="zone"
          :class="{ 'zone--hover': hoveredZone === ch.id }"
          rx="0.5"
        />
      </g>

      <!-- Other players -->
      <g v-for="p in playerList" :key="p.userId">
        <circle
          v-if="p.userId !== currentUserId"
          :cx="p.x / TILE_SIZE"
          :cy="p.y / TILE_SIZE"
          r="0.8"
          :fill="playerColor(p.userId)"
          stroke="rgba(15,15,20,0.9)"
          stroke-width="0.18"
        />
      </g>

      <!-- Local player (always on top, distinct marker) -->
      <g v-if="currentUserId && players.get(currentUserId)">
        <circle
          :cx="players.get(currentUserId)!.x / TILE_SIZE"
          :cy="players.get(currentUserId)!.y / TILE_SIZE"
          r="1.1"
          fill="#22d3ee"
          stroke="rgba(0,0,0,0.6)"
          stroke-width="0.22"
        />
        <circle
          :cx="players.get(currentUserId)!.x / TILE_SIZE"
          :cy="players.get(currentUserId)!.y / TILE_SIZE"
          r="2.1"
          fill="none"
          stroke="rgba(34, 211, 238, 0.5)"
          stroke-width="0.16"
        />
      </g>

      <!-- Hit areas for zones (rendered last so on top) -->
      <g v-for="ch in zonedChannels" :key="`hit-${ch.id}`">
        <rect
          :x="ch.mapZone!.x / TILE_SIZE"
          :y="ch.mapZone!.y / TILE_SIZE"
          :width="ch.mapZone!.w / TILE_SIZE"
          :height="ch.mapZone!.h / TILE_SIZE"
          class="zone-hit"
          @click="onZoneClick(ch)"
          @mouseenter="hoveredZone = ch.id"
          @mouseleave="hoveredZone === ch.id && (hoveredZone = null)"
        />
      </g>
    </svg>

    <!-- Zoom controls -->
    <div class="minimap__zoom">
      <button
        type="button"
        class="minimap__zoom-btn"
        title="Zoom +"
        :disabled="zoomTiles <= ZOOM_MIN"
        @click="zoomIn"
      >
        +
      </button>
      <button
        type="button"
        class="minimap__zoom-btn"
        title="Zoom -"
        :disabled="zoomTiles >= ZOOM_MAX"
        @click="zoomOut"
      >
        −
      </button>
    </div>

    <div v-if="hoveredZone" class="minimap__tooltip">
      <div class="tooltip__title">
        {{ zonedChannels.find((c) => c.id === hoveredZone)?.name }}
      </div>
      <div v-if="membersOfZone(hoveredZone).length" class="tooltip__list">
        <div v-for="m in membersOfZone(hoveredZone)" :key="m.userId" class="tooltip__member">
          <span class="tooltip__avatar" :style="{ background: playerColor(m.userId) }">
            {{ m.name?.[0]?.toUpperCase() ?? '?' }}
          </span>
          <span class="tooltip__name">{{ m.name }}</span>
        </div>
      </div>
      <div v-else class="tooltip__empty">Personne dans cette salle</div>
    </div>
  </div>
</template>

<style scoped>
.minimap {
  position: fixed;
  z-index: 35;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
  cursor: grab;
  user-select: none;
  background: rgba(70, 90, 60, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  touch-action: none;
}
.minimap--dragging {
  cursor: grabbing;
}
.minimap__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.zone {
  fill: rgba(99, 102, 241, 0.4);
  stroke: rgba(165, 180, 252, 0.9);
  stroke-width: 0.12;
  pointer-events: none;
  transition: fill 150ms;
}
.zone--hover {
  fill: rgba(165, 180, 252, 0.6);
}
.zone-hit {
  fill: transparent;
  cursor: pointer;
}

.minimap__zoom {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 2;
}
.minimap__zoom-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition:
    background 120ms,
    transform 120ms;
}
.minimap__zoom-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.75);
  transform: scale(1.06);
}
.minimap__zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Tooltip floats to the right of the circle */
.minimap__tooltip {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  min-width: 140px;
  max-width: 220px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(10, 10, 16, 0.95);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
  pointer-events: none;
  z-index: 1;
}
.tooltip__title {
  font-size: 11px;
  font-weight: 700;
  color: rgba(199, 210, 254, 0.95);
  margin-bottom: 5px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.tooltip__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tooltip__member {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tooltip__avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.tooltip__name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tooltip__empty {
  font-size: 10px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.35);
}
</style>
