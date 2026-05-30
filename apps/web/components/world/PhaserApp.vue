<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import type { useChatTabs } from '~/composables/useChatTabs';
import type { useVoice } from '~/composables/useVoice';
import type { usePresence } from '~/composables/usePresence';
import { useFloatingChannels } from '~/composables/useFloatingChannels';
import WidgetGamingTopic from '~/widgets/WidgetGamingTopic.vue';

const props = defineProps<{
  serverId: string;
  user: { id: string; name: string };
  voice: ReturnType<typeof useVoice>;
  presence: ReturnType<typeof usePresence>;
  chatTabs: ReturnType<typeof useChatTabs>;
  canManageMap: boolean;
  voiceChannels: ChannelPublic[];
}>();

const emit = defineEmits<{ 'channel-created': [channelId: string, type: string] }>();

const { updateChannel } = useChannels();

// useMap is a module-singleton — both this component and other callers share state.
const {
  currentMap,
  buildMode,
  buildTool,
  selectedDecor,
  selectedFloor,
  selectedTemplate,
  selectedWallRegion,
  selectedRoomTheme,
  isSaving: isMapSaving,
  paintRect,
  paintWallRect,
  placeDecor,
  removeDecorAt,
  eraseCell,
  applyTemplate,
  stampRoom,
  exportMapAsTemplate,
} = useMap();

const widgetWindows = useFloatingChannels({ width: 720, height: 560 });
const topicWindows = useFloatingChannels({ width: 760, height: 600 });
const forumPanel = ref<{ channelId: string; channelName: string } | null>(null);

const worldRef = ref<{ teleport: unknown } | null>(null);
const showMap = ref(false);

// ── Channel routing inside Phaser mode ─────────────────────────────────
function toggleForumPanel(channelId: string, channelName: string) {
  forumPanel.value = forumPanel.value?.channelId === channelId ? null : { channelId, channelName };
}

function openChannel(ch: ChannelPublic, e?: MouseEvent | KeyboardEvent) {
  if (ch.type === 'forum') {
    e?.stopPropagation();
    toggleForumPanel(ch.id, ch.name);
    return;
  }
  if (ch.type === 'widget') {
    widgetWindows.open({ id: ch.id, name: ch.name, widgetKind: ch.widgetKind });
    return;
  }
  props.chatTabs.openChannel(ch.id);
}

function openTopicWindow(ch: ChannelPublic) {
  topicWindows.open({ id: ch.id, name: ch.name });
}

// ── Build mode + shortcuts ─────────────────────────────────────────────
function toggleBuildMode() {
  buildMode.value = !buildMode.value;
}

function canEdit() {
  return props.canManageMap && buildMode.value;
}

function onBuildShortcut(e: KeyboardEvent) {
  if (!props.canManageMap) return;
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
      return;
    }
  }
  if (e.key === 'b' || e.key === 'B') {
    e.preventDefault();
    toggleBuildMode();
  }
}

// ── World event handlers ───────────────────────────────────────────────
type RectPayload = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mode: 'add' | 'remove';
  rot?: 0 | 90 | 180 | 270;
};

function onTilesRect(r: RectPayload) {
  if (canEdit()) paintRect(r.x1, r.y1, r.x2, r.y2, r.mode, selectedFloor.value);
}
function onApplyTemplate(id: string) {
  if (!canEdit()) return;
  if (!confirm('Remplacer la map actuelle par ce modèle ? Tu perdras ce que tu as posé.')) return;
  applyTemplate(id);
}
function onWallRect(p: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  region: { col: number; row: number; w: number; h: number };
  mode: 'add' | 'remove';
}) {
  if (canEdit()) paintWallRect(p.x1, p.y1, p.x2, p.y2, p.region, p.mode);
}
function onRoomRect(p: { x1: number; y1: number; x2: number; y2: number }) {
  if (canEdit()) stampRoom(p.x1, p.y1, p.x2, p.y2, selectedRoomTheme.value);
}
function onExportTemplate() {
  exportMapAsTemplate();
}
function onDecorPlace(p: { asset: string; x: number; y: number }) {
  if (canEdit()) placeDecor(p.asset, p.x, p.y);
}
function onDecorRemove(p: { x: number; y: number }) {
  if (canEdit()) removeDecorAt(p.x, p.y);
}
function onCellErase(p: { x: number; y: number }) {
  if (canEdit()) eraseCell(p.x, p.y);
}

// ── Zone picker (after creating a voice channel) ───────────────────────
const zonePickerActive = ref(false);
const pendingVoiceChannelId = ref<string | null>(null);

async function onZonePicked(zone: { x: number; y: number; w: number; h: number }) {
  zonePickerActive.value = false;
  if (!pendingVoiceChannelId.value) return;
  await updateChannel(props.serverId, pendingVoiceChannelId.value, { mapZone: zone });
  pendingVoiceChannelId.value = null;
}

function onZoneCancel() {
  zonePickerActive.value = false;
  pendingVoiceChannelId.value = null;
}

function onChannelCreated(channelId: string, type: string) {
  emit('channel-created', channelId, type);
  if (type === 'voice') {
    pendingVoiceChannelId.value = channelId;
    zonePickerActive.value = true;
  }
}

function openMap() {
  showMap.value = true;
}

function teleport(x: number, y: number) {
  onMinimapTeleport(x, y);
}

defineExpose({ openChannel, openTopicWindow, onChannelCreated, openMap, teleport });

// ── Minimap + spawn-on-leave teleport ──────────────────────────────────
const SPAWN_PX = { x: 35 * 32 + 16, y: 35 * 32 + 16 };

function onMinimapTeleport(x: number, y: number) {
  const teleport = worldRef.value?.teleport;
  if (typeof teleport === 'function') teleport(x, y);
}

watch(
  () => props.voice.currentChannelId.value,
  (next, prev) => {
    if (prev && !next && props.voice.returnToSpawnOnLeave.value) {
      const teleport = worldRef.value?.teleport;
      if (typeof teleport === 'function') teleport(SPAWN_PX.x, SPAWN_PX.y);
      props.voice.returnToSpawnOnLeave.value = false;
    }
  },
);

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(() => {
  window.addEventListener('keydown', onBuildShortcut);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onBuildShortcut);
  // Reset build mode when leaving Phaser (e.g. switching to classic interface).
  if (buildMode.value) buildMode.value = false;
});
</script>

<template>
  <ClientOnly>
    <WorldNookWorld
      ref="worldRef"
      :server-id="serverId"
      :user-id="user.id"
      :player-name="user.name"
      :zone-picker-active="zonePickerActive"
      :map-data="currentMap"
      :build-mode="buildMode"
      :build-tool="buildTool"
      :selected-decor="selectedDecor"
      :selected-floor="selectedFloor"
      :selected-wall-region="selectedWallRegion"
      sidebar-side="left"
      @zone-picked="onZonePicked"
      @zone-cancel="onZoneCancel"
      @tiles-rect="onTilesRect"
      @wall-rect="onWallRect"
      @room-rect="onRoomRect"
      @decor-place="onDecorPlace"
      @decor-remove="onDecorRemove"
      @cell-erase="onCellErase"
    />
  </ClientOnly>

  <WorldHudVoiceMembersHere />

  <WorldHudMapOverlay
    v-if="showMap"
    :map-data="currentMap ?? null"
    :voice-channels="voiceChannels"
    :players="presence.players.value"
    :voice-members="presence.voiceMembers.value"
    :current-user-id="user.id"
    :current-user-name="user.name"
    :current-voice-channel-id="voice.currentChannelId.value"
    @close="showMap = false"
    @teleport-to="onMinimapTeleport"
  />

  <ChatTabBar
    v-if="chatTabs.tabIds.value.length"
    :channel-ids="chatTabs.tabIds.value"
    :active-id="chatTabs.activeId.value"
    :dragging-channel-id="chatTabs.draggingId.value"
    @close="chatTabs.closeAllTabs"
    @close-tab="chatTabs.closeTab"
    @set-active="(id: string) => (chatTabs.activeId.value = id)"
    @tear-off="chatTabs.tearOff"
    @dock="chatTabs.dockToTabBar"
  />

  <ChatWindow
    v-for="(win, i) in chatTabs.floating.value"
    :key="win.channelId"
    :channel-id="win.channelId"
    :initial-x="win.x"
    :initial-y="win.y"
    :z-index="45 + i"
    @close="chatTabs.closeFloating(win.channelId)"
    @focus="chatTabs.focusFloating(win.channelId)"
    @drag-start="chatTabs.draggingId.value = win.channelId"
    @drag-end="chatTabs.draggingId.value = null"
  />

  <ChannelForumPanel
    v-if="forumPanel"
    :server-id="serverId"
    :channel-id="forumPanel.channelId"
    :channel-name="forumPanel.channelName"
    @close="forumPanel = null"
    @open-post="chatTabs.openChannel"
  />

  <WidgetWindow
    v-for="(w, i) in widgetWindows.windows.value"
    :key="w.channelId"
    :server-id="serverId"
    :channel-id="w.channelId"
    :channel-name="w.channelName"
    :widget-kind="w.widgetKind ?? null"
    :initial-x="w.x"
    :initial-y="w.y"
    :z-index="70 + i"
    @close="widgetWindows.close(w.channelId)"
    @focus="widgetWindows.focus(w.channelId)"
    @drag-end="(x: number, y: number) => widgetWindows.updatePosition(w.channelId, x, y)"
  />

  <WidgetGamingTopic
    v-for="(w, i) in topicWindows.windows.value"
    :key="w.channelId"
    :server-id="serverId"
    :channel-id="w.channelId"
    :channel-name="w.channelName"
    :initial-x="w.x"
    :initial-y="w.y"
    :z-index="82 + i"
    @close="topicWindows.close(w.channelId)"
    @focus="topicWindows.focus(w.channelId)"
    @drag-end="(x: number, y: number) => topicWindows.updatePosition(w.channelId, x, y)"
  />

  <ClientOnly>
    <WorldBuildPanel
      v-if="canManageMap && buildMode"
      :tool="buildTool"
      :is-saving="isMapSaving"
      :selected-decor="selectedDecor"
      :selected-floor="selectedFloor"
      :selected-template="selectedTemplate"
      :selected-wall-region="selectedWallRegion"
      :selected-room-theme="selectedRoomTheme"
      @update:tool="buildTool = $event"
      @update:selected-decor="selectedDecor = $event"
      @update:selected-floor="selectedFloor = $event"
      @update:selected-template="selectedTemplate = $event"
      @update:selected-wall-region="selectedWallRegion = $event"
      @update:selected-room-theme="selectedRoomTheme = $event"
      @apply-template="onApplyTemplate"
      @export-template="onExportTemplate"
      @close="toggleBuildMode"
    />
  </ClientOnly>
</template>
