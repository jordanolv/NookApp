<script setup lang="ts">
import { computed } from 'vue';
import type { MapData, ChannelPublic, VoiceParticipant } from '@nookapp/protocol';
import type { PresencePlayer } from '~/composables/usePresence';
import { useMinimapPosition } from '~/composables/useMinimapPosition';
import { hueFor } from '~/utils/channel-format';

const TILE_SIZE = 32;
const WORLD = 70;
const DEFAULT_ZOOM = 26;
const ZOOM_MIN = 8;
const ZOOM_MAX = 60;
const ZOOM_STEP = 4;
const SIZE = 180;

const props = defineProps<{
  mapData: MapData | null;
  voiceChannels: ChannelPublic[];
  players: Map<string, PresencePlayer>;
  voiceMembers: Map<string, VoiceParticipant[]>;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentVoiceChannelId?: string | null;
  embedded?: boolean;
}>();

const emit = defineEmits<{
  'teleport-to': [x: number, y: number];
}>();

const hoveredZone = ref<string | null>(null);

const position = useMinimapPosition({
  storageKey: 'world:minimap:pos',
  size: SIZE,
  defaultZoom: DEFAULT_ZOOM,
  zoomMin: ZOOM_MIN,
  zoomMax: ZOOM_MAX,
  zoomStep: ZOOM_STEP,
});

const floors = computed(() => props.mapData?.layers?.floors ?? []);
const walls = computed(() => props.mapData?.layers?.walls ?? []);
const zonedChannels = computed(() => props.voiceChannels.filter((c) => c.mapZone));
const playerList = computed(() => Array.from(props.players.values()));

const floorPath = computed(() => cellsToPath(floors.value));
const wallPath = computed(() => cellsToPath(walls.value));

const viewBoxStr = computed(() => {
  const me = props.currentUserId ? props.players.get(props.currentUserId) : null;
  const z = position.zoomTiles.value;
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

function playerColor(userId: string): string {
  return `hsl(${hueFor(userId)}, 75%, 60%)`;
}

function membersOfZone(channelId: string): VoiceParticipant[] {
  return augmentedVoiceMembers.value.get(channelId) ?? [];
}

function cellsToPath(cells: ReadonlyArray<{ x: number; y: number }>): string {
  return cells.map((cell) => `M${cell.x} ${cell.y}h1v1h-1z`).join('');
}

function onZoneClick(ch: ChannelPublic) {
  if (position.wasDragged()) return;
  if (!ch.mapZone) return;
  const cx = ch.mapZone.x + ch.mapZone.w / 2;
  const cy = ch.mapZone.y + ch.mapZone.h / 2;
  emit('teleport-to', cx, cy);
}
</script>

<template>
  <div
    class="minimap"
    :class="{
      'minimap--dragging': position.dragging.value,
      'minimap--embedded': embedded,
    }"
    :style="
      embedded
        ? { position: 'static', width: '100%', height: '100%', borderRadius: '14px' }
        : {
            left: `${position.pos.value.x}px`,
            top: `${position.pos.value.y}px`,
            width: `${SIZE}px`,
            height: `${SIZE}px`,
          }
    "
    @pointerdown="embedded ? undefined : position.onPointerDown($event)"
  >
    <svg class="minimap__svg" :viewBox="viewBoxStr" preserveAspectRatio="xMidYMid meet">
      <path v-if="floorPath" :d="floorPath" fill="rgba(243, 234, 212, 0.5)" />
      <path v-if="wallPath" :d="wallPath" fill="rgba(40, 40, 50, 0.95)" />

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

    <div class="minimap__zoom">
      <button
        type="button"
        class="minimap__zoom-btn"
        title="Zoom +"
        :disabled="position.zoomTiles.value <= ZOOM_MIN"
        @click="position.zoomIn"
      >
        +
      </button>
      <button
        type="button"
        class="minimap__zoom-btn"
        title="Zoom -"
        :disabled="position.zoomTiles.value >= ZOOM_MAX"
        @click="position.zoomOut"
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
.minimap--embedded {
  cursor: default;
  box-shadow: none;
  background: var(--surface-tinted);
  border: 1px solid var(--surface-border);
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
