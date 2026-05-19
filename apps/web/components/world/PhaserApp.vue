<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
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
  selectedWallFrame,
  selectedRoomTemplate,
  isSaving: isMapSaving,
  paintRect,
  paintWallCell,
  stampRoomTemplate,
  stampCustomRoom,
  placeDecor,
  removeDecorAt,
} = useMap();

const widgetWindows = useFloatingChannels({ width: 720, height: 560 });
const topicWindows = useFloatingChannels({ width: 760, height: 600 });
const forumPanel = ref<{ channelId: string; channelName: string } | null>(null);

const worldRef = ref<{ teleport: unknown } | null>(null);

// ── Channel routing inside Phaser mode ─────────────────────────────────
function toggleForumPanel(channelId: string, channelName: string) {
  forumPanel.value = forumPanel.value?.channelId === channelId ? null : { channelId, channelName };
}

function openChannel(ch: ChannelPublic, e?: MouseEvent) {
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
  if (e.key !== 'b' && e.key !== 'B') return;
  if (!props.canManageMap) return;
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
      return;
    }
  }
  e.preventDefault();
  toggleBuildMode();
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
function onWallCell(p: { x: number; y: number; frame: number; mode: 'add' | 'remove' }) {
  if (canEdit()) paintWallCell(p.x, p.y, p.frame, p.mode);
}
function onRoomTemplateStamp(p: { x: number; y: number; templateId: string }) {
  if (canEdit()) stampRoomTemplate(p.x, p.y, p.templateId);
}
function onRoomCustomStamp(p: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  themeFrame: number;
}) {
  if (canEdit()) stampCustomRoom(p.x1, p.y1, p.x2, p.y2, p.themeFrame);
}
function onDecorPlace(p: { asset: string; x: number; y: number }) {
  if (canEdit()) placeDecor(p.asset, p.x, p.y);
}
function onDecorRemove(p: { x: number; y: number }) {
  if (canEdit()) removeDecorAt(p.x, p.y);
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

defineExpose({ openChannel, openTopicWindow, onChannelCreated });

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

const showBuildToggle = computed(() => props.canManageMap);
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
      :selected-wall-frame="selectedWallFrame"
      :selected-room-template="selectedRoomTemplate"
      sidebar-side="left"
      @zone-picked="onZonePicked"
      @zone-cancel="onZoneCancel"
      @tiles-rect="onTilesRect"
      @wall-cell="onWallCell"
      @room-template-stamp="onRoomTemplateStamp"
      @room-custom-stamp="onRoomCustomStamp"
      @decor-place="onDecorPlace"
      @decor-remove="onDecorRemove"
    />
  </ClientOnly>

  <VoiceMembersWindow />

  <ClientOnly>
    <WorldMinimap
      :map-data="currentMap ?? null"
      :voice-channels="voiceChannels"
      :players="presence.players.value"
      :voice-members="presence.voiceMembers.value"
      :current-user-id="user.id"
      :current-user-name="user.name"
      :current-voice-channel-id="voice.currentChannelId.value"
      @teleport-to="onMinimapTeleport"
    />
  </ClientOnly>

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

  <button
    v-if="showBuildToggle"
    class="build-toggle"
    :class="{ 'build-toggle--active': buildMode }"
    :title="buildMode ? 'Quitter le mode build (B)' : 'Activer le mode build (B)'"
    @click="toggleBuildMode"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M22 9l-3.39-.34-1.46-3.15-2.91 1.81L11 6l-1.24 3.32-2.91-1.81L5.39 10.66 2 11l1.81 2.91L2 16.83l3.39.34 1.46 3.15 2.91-1.81L11 22l1.24-3.32 2.91 1.81 1.46-3.15L22 17l-1.81-2.91z"
      />
    </svg>
    <span>{{ buildMode ? 'Quitter' : 'Build' }}</span>
  </button>

  <ClientOnly>
    <WorldBuildPanel
      v-if="canManageMap && buildMode"
      :tool="buildTool"
      :is-saving="isMapSaving"
      :selected-decor="selectedDecor"
      :selected-floor="selectedFloor"
      :selected-wall-frame="selectedWallFrame"
      :selected-room-template="selectedRoomTemplate"
      @update:tool="buildTool = $event"
      @update:selected-decor="selectedDecor = $event"
      @update:selected-floor="selectedFloor = $event"
      @update:selected-wall-frame="selectedWallFrame = $event"
      @update:selected-room-template="selectedRoomTemplate = $event"
      @close="toggleBuildMode"
    />
  </ClientOnly>
</template>

<style scoped>
.build-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(15, 15, 20, 0.78);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms,
    box-shadow 120ms;
}

.build-toggle--active {
  background: rgba(99, 102, 241, 0.92);
  color: white;
  border-color: rgba(165, 180, 252, 0.5);
  box-shadow:
    0 8px 24px rgba(99, 102, 241, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
</style>
