<script setup lang="ts">
import { markRaw } from 'vue';
import { Hash, Pin, PinOff, RotateCcw, Settings, Trash2, Users } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';
import { useHomePins, type HomePinKind } from '~/composables/useHomePins';
import { useInterfacePreferences } from '~/composables/useInterfacePreferences';
import WidgetGamingTopic from '~/widgets/WidgetGamingTopic.vue';

definePageMeta({ layout: 'app' });

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);

const { store, fetchServers } = useServers();
const { fetchChannels, updateChannel, deleteChannel } = useChannels();
const { fetchCategories } = useCategories();
const { store: messagesStore, fetchMessageCounts } = useMessages();
const { user } = useAuth();
const { createInvite } = useInvites();
const socket = useSocket();
const voice = useVoice();
const { isAdmin, canManageChannels, canManageMap, loadMember } = useMember();
const interfacePrefs = useInterfacePreferences();
const classicEnabled = computed(() => interfacePrefs.prefs.value.useClassicInterface);
const {
  currentMap,
  buildMode,
  buildTool,
  isSaving: isMapSaving,
  loadMap,
  paintRect,
  paintWallsRect,
} = useMap();

// ── Chat: main tab bar + torn-off floating windows ──
interface FloatingChat {
  channelId: string;
  x: number;
  y: number;
}

const chatTabChannelIds = ref<string[]>([]);
const chatTabActiveId = ref<string | null>(null);
const floatingChats = ref<FloatingChat[]>([]);
const draggingFloatingId = ref<string | null>(null);
let chatStaggerCounter = 0;

function openChannel(channelId: string) {
  // If it's already a floating window, focus it.
  if (floatingChats.value.some((w) => w.channelId === channelId)) {
    focusFloating(channelId);
    return;
  }
  // Otherwise add it as a tab in the main chat window.
  if (!chatTabChannelIds.value.includes(channelId)) {
    chatTabChannelIds.value = [...chatTabChannelIds.value, channelId];
  }
  chatTabActiveId.value = channelId;
}

function openChannelById(channelId: string) {
  openChannel(channelId);
}

function closeAllTabs() {
  chatTabChannelIds.value = [];
  chatTabActiveId.value = null;
}

function closeTab(channelId: string) {
  const idx = chatTabChannelIds.value.indexOf(channelId);
  chatTabChannelIds.value = chatTabChannelIds.value.filter((id) => id !== channelId);
  if (chatTabActiveId.value === channelId) {
    chatTabActiveId.value = chatTabChannelIds.value[Math.max(0, idx - 1)] ?? null;
  }
}

function closeFloating(channelId: string) {
  floatingChats.value = floatingChats.value.filter((w) => w.channelId !== channelId);
}

function focusFloating(channelId: string) {
  const win = floatingChats.value.find((w) => w.channelId === channelId);
  if (!win) return;
  floatingChats.value = [...floatingChats.value.filter((w) => w.channelId !== channelId), win];
}

// Called by ChatTabBar when a tab is dragged out of the main window.
function onTearOff(channelId: string, x: number, y: number) {
  closeTab(channelId);
  floatingChats.value = [...floatingChats.value, { channelId, x, y }];
}

// Called when a floating chat is dragged back onto the main tab bar.
function dockToTabBar(channelId: string) {
  draggingFloatingId.value = null;
  closeFloating(channelId);
  if (!chatTabChannelIds.value.includes(channelId)) {
    chatTabChannelIds.value = [...chatTabChannelIds.value, channelId];
  }
  chatTabActiveId.value = channelId;
}

void chatStaggerCounter;

const activeChannelIds = computed(
  () => new Set([...chatTabChannelIds.value, ...floatingChats.value.map((w) => w.channelId)]),
);

const uiLayout = useUiLayout();
const homePins = useHomePins(serverId);

const showLayoutMenu = ref(false);
const layoutMenuAnchor = ref({ bottom: 0, left: 0 });

function closeLayoutMenu() {
  showLayoutMenu.value = false;
}

async function resetLayout() {
  closeLayoutMenu();
  if (!window.confirm('Réinitialiser la disposition par défaut ?')) return;
  uiLayout.resetLayout();
  await uiLayout.flush();
  window.location.reload();
}

// ── Server picker ──
const showServerPicker = ref(false);
const serverPickerAnchor = ref<DOMRect | null>(null);
const serversExpanded = ref(false);
const showServerSettings = ref(false);

function switchServer(id: string) {
  showServerPicker.value = false;
  serversExpanded.value = false;
  navigateTo(`/app/${id}`);
}

const pickerTop = computed(() => {
  if (!serverPickerAnchor.value) return 64;
  return serverPickerAnchor.value.bottom + 8;
});

// ── Channel creation ──
const showCreateModal = ref(false);

// ── Channel editing ──
const editingChannel = ref<import('@nookapp/protocol').ChannelPublic | null>(null);

const channelMenu = ref<{
  x: number;
  y: number;
  channel: import('@nookapp/protocol').ChannelPublic;
} | null>(null);

function closeChannelMenu() {
  channelMenu.value = null;
}

function editChannelFromMenu() {
  if (!channelMenu.value) return;
  editingChannel.value = channelMenu.value.channel;
  closeChannelMenu();
}

async function deleteChannelFromMenu() {
  if (!channelMenu.value) return;
  const ch = channelMenu.value.channel;
  closeChannelMenu();
  if (!confirm(`Supprimer le salon « ${ch.name} » ?`)) return;
  await deleteChannel(serverId.value, ch.id);
}

function toggleChannelPinFromMenu() {
  if (!channelMenu.value) return;
  homePins.toggleChannel(channelMenu.value.channel, 'channel');
  closeChannelMenu();
}

function isChannelPinnedToHome(channelId: string): boolean {
  return homePins.isPinned(channelId, 'channel');
}

function handleChannelClick(ch: import('@nookapp/protocol').ChannelPublic, e: MouseEvent) {
  if (ch.type === 'voice') {
    handleVoiceChannelClick(ch.id);
    return;
  }
  if (ch.type === 'forum') {
    openForumPanel(ch.id, ch.name, e);
    return;
  }
  if (ch.type === 'widget') {
    openWidgetWindow(ch);
    return;
  }
  openChannel(ch.id);
}

// ── Forum panel ──
const forumPanelChannelId = ref<string | null>(null);
const forumPanelChannelName = ref('');

function openForumPanel(channelId: string, channelName: string, e: MouseEvent) {
  if (forumPanelChannelId.value === channelId) {
    forumPanelChannelId.value = null;
    return;
  }
  forumPanelChannelId.value = channelId;
  forumPanelChannelName.value = channelName;
  e.stopPropagation();
}

// ── Widget windows ──
const widgetWindows = ref<
  { channelId: string; channelName: string; widgetKind: string | null; x: number; y: number }[]
>([]);
let widgetWindowCounter = 0;

function openWidgetWindow(ch: import('@nookapp/protocol').ChannelPublic) {
  const existing = widgetWindows.value.find((w) => w.channelId === ch.id);
  if (existing) {
    focusWidgetWindow(ch.id);
    return;
  }
  const stagger = (widgetWindowCounter % 6) * 28;
  const x = import.meta.client ? Math.round(window.innerWidth / 2 - 360) + stagger : 200;
  const y = import.meta.client ? Math.round(window.innerHeight / 2 - 280) + stagger : 100;
  widgetWindowCounter++;
  widgetWindows.value = [
    ...widgetWindows.value,
    { channelId: ch.id, channelName: ch.name, widgetKind: ch.widgetKind, x, y },
  ];
}

function closeWidgetWindow(channelId: string) {
  widgetWindows.value = widgetWindows.value.filter((w) => w.channelId !== channelId);
}

function focusWidgetWindow(channelId: string) {
  const w = widgetWindows.value.find((x) => x.channelId === channelId);
  if (!w) return;
  widgetWindows.value = [...widgetWindows.value.filter((x) => x.channelId !== channelId), w];
}

// ── Homepage pinned game windows ──
interface HomeTopicWin {
  channelId: string;
  channelName: string;
  x: number;
  y: number;
}

const homeTopicWindows = ref<HomeTopicWin[]>([]);
let homeTopicCounter = 0;

function openHomeTopicWindow(channelId: string, channelName: string) {
  const existing = homeTopicWindows.value.find((w) => w.channelId === channelId);
  if (existing) {
    focusHomeTopicWindow(channelId);
    return;
  }
  const stagger = (homeTopicCounter % 6) * 28;
  const x = import.meta.client ? Math.round(window.innerWidth / 2 - 380) + stagger : 220;
  const y = import.meta.client ? Math.round(window.innerHeight / 2 - 300) + stagger : 110;
  homeTopicCounter++;
  homeTopicWindows.value = [...homeTopicWindows.value, { channelId, channelName, x, y }];
}

function closeHomeTopicWindow(channelId: string) {
  homeTopicWindows.value = homeTopicWindows.value.filter((w) => w.channelId !== channelId);
}

function focusHomeTopicWindow(channelId: string) {
  const win = homeTopicWindows.value.find((w) => w.channelId === channelId);
  if (!win) return;
  homeTopicWindows.value = [
    ...homeTopicWindows.value.filter((w) => w.channelId !== channelId),
    win,
  ];
}

const SIDEBAR_SECTIONS = markRaw([
  { key: 'channels', label: 'Salons', icon: Hash },
  { key: 'members', label: 'Membres', icon: Users },
  { key: 'pinned', label: 'Épinglés', icon: Pin },
]);
const sidebar = useSidebar(
  SIDEBAR_SECTIONS.map((s) => s.key),
  ['channels'],
);

const voiceChannels = computed(() =>
  store.channels.filter((c) => c.type === 'voice' && c.serverId === serverId.value),
);

// Shared presence state (player positions + voice channel members) for the minimap.
const presence = usePresence();

// Imperative handle to the world for teleporting.
const worldRef = ref<{ teleport: unknown } | null>(null);

function onMinimapTeleport(x: number, y: number) {
  const teleport = worldRef.value?.teleport;
  if (typeof teleport === 'function') teleport(x, y);
}

// Teleport the avatar to spawn only when the explicit dock leave button was
// used (returnToSpawnOnLeave flag set by leaveExplicit). Walking out of a room
// or page-unload cleanups go through plain leave() and leave the avatar put.
const SPAWN_PX = { x: 35 * 32 + 16, y: 35 * 32 + 16 };
watch(
  () => voice.currentChannelId.value,
  (next, prev) => {
    if (prev && !next && voice.returnToSpawnOnLeave.value) {
      const teleport = worldRef.value?.teleport;
      if (typeof teleport === 'function') teleport(SPAWN_PX.x, SPAWN_PX.y);
      voice.returnToSpawnOnLeave.value = false;
    }
  },
);

function openServerMenuFromSidebar(e: MouseEvent) {
  serverPickerAnchor.value = (e.currentTarget as HTMLElement).getBoundingClientRect();
  showServerPicker.value = true;
}

function openHomePinnedItem(channel: ChannelPublic, kind: HomePinKind) {
  if (kind === 'game') {
    openHomeTopicWindow(channel.id, channel.name);
    return;
  }
  if (channel.type === 'voice') {
    void handleVoiceChannelClick(channel.id);
    return;
  }
  if (channel.type === 'forum') {
    forumPanelChannelId.value = forumPanelChannelId.value === channel.id ? null : channel.id;
    forumPanelChannelName.value = channel.name;
    return;
  }
  if (channel.type === 'widget') {
    openWidgetWindow(channel);
    return;
  }
  openChannelById(channel.id);
}

// ── Zone picker ──
const zonePickerActive = ref(false);
const pendingVoiceChannelId = ref<string | null>(null);

function onChannelCreated(channelId: string, type: string) {
  showCreateModal.value = false;
  if (type === 'voice') {
    pendingVoiceChannelId.value = channelId;
    zonePickerActive.value = true;
  }
}

async function onZonePicked(zone: { x: number; y: number; w: number; h: number }) {
  zonePickerActive.value = false;
  if (!pendingVoiceChannelId.value) return;
  await updateChannel(serverId.value, pendingVoiceChannelId.value, { mapZone: zone });
  pendingVoiceChannelId.value = null;
}

function onZoneCancel() {
  zonePickerActive.value = false;
  pendingVoiceChannelId.value = null;
}

const { apiBase } = useRuntimeConfig().public;
const apiOrigin = new URL(apiBase as string).origin;

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${apiOrigin}${url}` : url;
}

const showInviteModal = ref(false);
const inviteUrl = ref('');
const inviteLoading = ref(false);
const inviteCopied = ref(false);

async function handleInvite() {
  showInviteModal.value = true;
  if (inviteUrl.value) return;
  inviteLoading.value = true;
  try {
    const invite = await createInvite(serverId.value);
    inviteUrl.value = `${window.location.origin}/invite/${invite.code}`;
  } finally {
    inviteLoading.value = false;
  }
}

async function copyInviteUrl() {
  await navigator.clipboard.writeText(inviteUrl.value);
  inviteCopied.value = true;
  setTimeout(() => (inviteCopied.value = false), 2000);
}

function closeInviteModal() {
  showInviteModal.value = false;
}

if (!store.ready) await fetchServers();

const server = computed(() => store.list.find((s) => s.id === serverId.value) ?? null);

watch(
  serverId,
  async (id) => {
    const found = store.list.find((s) => s.id === id) ?? null;
    store.setCurrent(found);
    if (!found) return;
    // Each request is isolated: a 404 on /map (e.g. API not yet deployed with
    // the new module) must not block the channel list or member fetch.
    await Promise.all([
      fetchChannels(id),
      fetchCategories(id),
      fetchMessageCounts(id).catch((err) => console.warn('fetchMessageCounts failed', err)),
      loadMember(id).catch((err) => console.warn('loadMember failed', err)),
      loadMap(id).catch((err) => console.warn('loadMap failed', err)),
    ]);
  },
  { immediate: true },
);

type RectPayload = { x1: number; y1: number; x2: number; y2: number; mode: 'add' | 'remove' };

function onTilesRect(rect: RectPayload) {
  if (!canManageMap.value || !buildMode.value) return;
  paintRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.mode);
}

function onWallsRect(rect: RectPayload) {
  if (!canManageMap.value || !buildMode.value) return;
  paintWallsRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.mode);
}

function toggleBuildMode() {
  if (classicEnabled.value) return;
  buildMode.value = !buildMode.value;
}

watch(classicEnabled, (enabled) => {
  if (enabled && buildMode.value) buildMode.value = false;
});

async function handleVoiceChannelClick(channelId: string) {
  if (voice.currentChannelId.value === channelId) {
    await voice.leave();
  } else {
    await voice.join(serverId.value, channelId);
  }
}

let teardownVoiceListeners: (() => void) | null = null;
let teardownMessageCounter: (() => void) | null = null;

onMounted(() => {
  socket.connect();
  teardownVoiceListeners = voice.setupListeners();
  teardownMessageCounter = socket.onMessage((msg) => {
    if (msg.authorId.startsWith('plugin:')) return;
    messagesStore.incrementCount(msg.channelId);
  });
});

onUnmounted(async () => {
  if (voice.currentChannelId.value) await voice.leave();
  teardownVoiceListeners?.();
  teardownMessageCounter?.();
  socket.disconnect();
});
</script>

<template>
  <div class="page-root">
    <ClassicLayout v-if="classicEnabled" :server-id="serverId" />

    <template v-else>
      <!-- World fills the entire viewport behind everything -->
      <ClientOnly>
        <WorldNookWorld
          v-if="user?.id"
          ref="worldRef"
          :server-id="serverId"
          :user-id="user.id"
          :player-name="user.name"
          :zone-picker-active="zonePickerActive"
          :map-data="currentMap"
          :build-mode="buildMode"
          :build-tool="buildTool"
          :sidebar-side="sidebar.side.value"
          @zone-picked="onZonePicked"
          @zone-cancel="onZoneCancel"
          @tiles-rect="onTilesRect"
          @walls-rect="onWallsRect"
        />
      </ClientOnly>

      <!-- Sidebar (icons + stacked content + user dock) -->
      <LayoutSideBar
        :side="sidebar.side.value"
        :sections="SIDEBAR_SECTIONS"
        :order="sidebar.order.value"
        :active-keys="sidebar.activeSet.value"
        :section-heights="sidebar.sectionHeights.value"
        :server-name="server?.name ?? ''"
        :banner-url="resolveUrl(server?.bannerUrl) ?? null"
        @toggle-section="sidebar.toggleSection"
        @swap-side="sidebar.swapSide"
        @set-order="sidebar.setOrder"
        @set-section-height="sidebar.setSectionHeight"
        @open-server-menu="openServerMenuFromSidebar"
      >
        <template #user-dock>
          <LayoutUserDock />
        </template>
        <template #channels>
          <LayoutChannelsList
            :channels="store.channels.filter((c) => c.serverId === serverId && c.type !== 'voice')"
            :categories="store.categories.filter((c) => c.serverId === serverId)"
            :active-channel-ids="activeChannelIds"
            :current-voice-id="voice.currentChannelId.value"
            @select="handleChannelClick"
          />
        </template>
        <template #members>
          <HomeMembersList :server-id="serverId" />
        </template>
        <template #pinned>
          <HomePinsList :server-id="serverId" @open="openHomePinnedItem" />
        </template>
      </LayoutSideBar>

      <!-- Voice members list (visible while connected to a voice channel) -->
      <VoiceMembersWindow />

      <!-- Minimap (self-contained, draggable, round tactical HUD) -->
      <WorldMinimap
        :map-data="currentMap ?? null"
        :voice-channels="voiceChannels"
        :players="presence.players.value"
        :voice-members="presence.voiceMembers.value"
        :current-user-id="user?.id ?? null"
        :current-user-name="user?.name ?? null"
        :current-voice-channel-id="voice.currentChannelId.value"
        @teleport-to="onMinimapTeleport"
      />

      <!-- Main chat window (chrome-style tabs) -->
      <ChatTabBar
        v-if="chatTabChannelIds.length > 0"
        :channel-ids="chatTabChannelIds"
        :active-id="chatTabActiveId"
        :dragging-channel-id="draggingFloatingId"
        @close="closeAllTabs"
        @close-tab="closeTab"
        @set-active="chatTabActiveId = $event"
        @tear-off="onTearOff"
        @dock="dockToTabBar"
      />

      <!-- Torn-off floating chat windows -->
      <ChatWindow
        v-for="(win, i) in floatingChats"
        :key="win.channelId"
        :channel-id="win.channelId"
        :initial-x="win.x"
        :initial-y="win.y"
        :z-index="45 + i"
        @close="closeFloating(win.channelId)"
        @focus="focusFloating(win.channelId)"
        @drag-start="draggingFloatingId = win.channelId"
        @drag-end="draggingFloatingId = null"
      />

      <!-- Layout menu popover -->
      <Teleport to="body">
        <div v-if="showLayoutMenu" class="fixed inset-0 z-[80]" @click="closeLayoutMenu" />
        <div
          v-if="showLayoutMenu"
          class="fixed flex flex-col gap-0.5 rounded-xl p-1.5 z-[81]"
          :style="{
            left: `${layoutMenuAnchor.left}px`,
            bottom: `${layoutMenuAnchor.bottom}px`,
            width: '220px',
            background: 'rgba(10, 10, 16, 0.96)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
          }"
          @click.stop
        >
          <button
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
            @click="resetLayout"
          >
            <RotateCcw :size="13" style="color: rgba(255, 255, 255, 0.5)" />
            <span class="flex-1 text-xs font-semibold" style="color: rgba(255, 255, 255, 0.85)">
              Réinitialiser la disposition
            </span>
          </button>
        </div>
      </Teleport>

      <!-- ── Server picker dropdown ── -->
      <Teleport to="body">
        <div
          v-if="showServerPicker"
          class="fixed inset-0 z-[55]"
          @click="showServerPicker = false"
        />
        <div
          v-if="showServerPicker"
          class="fixed z-[56] flex flex-col rounded-2xl overflow-hidden py-1.5"
          :style="{
            top: pickerTop + 'px',
            right: '16px',
            minWidth: '200px',
            background: 'rgba(10, 10, 16, 0.95)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
          }"
        >
          <!-- Nook select (collapsed by default — click to expand list) -->
          <div class="px-1.5 pt-1.5">
            <button
              class="server-picker-row flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
              :style="serversExpanded ? 'background: rgba(255,255,255,0.05)' : ''"
              @click="serversExpanded = !serversExpanded"
            >
              <div
                class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style="background: linear-gradient(135deg, #6366f1, #4338ca)"
              >
                {{ server?.name?.[0]?.toUpperCase() }}
              </div>
              <span
                class="flex-1 truncate text-xs font-medium"
                style="color: rgba(255, 255, 255, 0.85)"
                >{{ server?.name }}</span
              >
              <svg
                class="flex-shrink-0 transition-transform duration-150"
                :style="serversExpanded ? 'transform: rotate(180deg)' : ''"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                style="color: rgba(255, 255, 255, 0.4)"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>

            <div v-if="serversExpanded" class="mt-1 flex flex-col gap-0.5">
              <button
                v-for="s in store.list.filter((s) => s.id !== serverId)"
                :key="s.id"
                class="server-picker-row flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
                @click="switchServer(s.id)"
              >
                <div
                  class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style="background: linear-gradient(135deg, #6366f1, #4338ca)"
                >
                  {{ s.name[0]?.toUpperCase() }}
                </div>
                <span
                  class="truncate text-xs font-medium"
                  style="color: rgba(255, 255, 255, 0.7)"
                  >{{ s.name }}</span
                >
              </button>
            </div>
          </div>

          <div class="mx-3 my-1.5" style="height: 1px; background: rgba(255, 255, 255, 0.06)" />

          <!-- Current server actions -->
          <button
            class="flex items-center gap-3 px-3 py-2 text-left transition-colors server-picker-row"
            @click="
              showServerPicker = false;
              handleInvite();
            "
          >
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.55)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
            </div>
            <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.75)"
              >Inviter des gens</span
            >
          </button>
          <NuxtLink
            :to="`/app/${serverId}/plugins`"
            class="flex items-center gap-3 px-3 py-2 transition-colors server-picker-row"
            @click="showServerPicker = false"
          >
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.55)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"
                />
              </svg>
            </div>
            <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.75)"
              >Plugins</span
            >
          </NuxtLink>
          <button
            v-if="isAdmin"
            class="flex items-center gap-3 px-3 py-2 text-left transition-colors server-picker-row"
            @click="
              showServerPicker = false;
              showServerSettings = true;
            "
          >
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.55)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
                />
              </svg>
            </div>
            <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.75)"
              >Paramètres du serveur</span
            >
          </button>

          <div class="mx-3 my-1" style="height: 1px; background: rgba(255, 255, 255, 0.06)" />
          <NuxtLink
            to="/app"
            class="flex items-center gap-3 px-3 py-2 transition-colors server-picker-row"
            @click="showServerPicker = false"
          >
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style="background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.4)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.4)">Accueil</span>
          </NuxtLink>
        </div>
      </Teleport>

      <!-- ── Forum panel ── -->
      <ChannelForumPanel
        v-if="forumPanelChannelId"
        :server-id="serverId"
        :channel-id="forumPanelChannelId"
        :channel-name="forumPanelChannelName"
        @close="forumPanelChannelId = null"
        @open-post="openChannelById"
      />

      <!-- ── Widget windows ── -->
      <WidgetWindow
        v-for="(w, i) in widgetWindows"
        :key="w.channelId"
        :server-id="serverId"
        :channel-id="w.channelId"
        :channel-name="w.channelName"
        :widget-kind="w.widgetKind"
        :initial-x="w.x"
        :initial-y="w.y"
        :z-index="70 + i"
        @close="closeWidgetWindow(w.channelId)"
        @focus="focusWidgetWindow(w.channelId)"
        @drag-end="
          (x, y) => {
            w.x = x;
            w.y = y;
          }
        "
      />

      <WidgetGamingTopic
        v-for="(w, i) in homeTopicWindows"
        :key="w.channelId"
        :server-id="serverId"
        :channel-id="w.channelId"
        :channel-name="w.channelName"
        :initial-x="w.x"
        :initial-y="w.y"
        :z-index="82 + i"
        @close="closeHomeTopicWindow(w.channelId)"
        @focus="focusHomeTopicWindow(w.channelId)"
        @drag-end="
          (x, y) => {
            w.x = x;
            w.y = y;
          }
        "
      />

      <!-- ── Server settings modal ── -->
      <ServerSettingsModal
        v-if="showServerSettings"
        :server-id="serverId"
        :server-name="server?.name"
        @close="showServerSettings = false"
      />

      <!-- ── Create channel modal ── -->
      <ChannelCreateChannelModal
        v-if="showCreateModal"
        :server-id="serverId"
        @close="showCreateModal = false"
        @created="onChannelCreated"
      />

      <!-- ── Edit channel modal ── -->
      <ChannelEditChannelModal
        v-if="editingChannel"
        :server-id="serverId"
        :channel="editingChannel"
        @close="editingChannel = null"
        @updated="editingChannel = null"
      />

      <!-- Build panel (admin + build mode only) -->
      <ClientOnly>
        <WorldBuildPanel
          v-if="canManageMap && buildMode"
          :tool="buildTool"
          :is-saving="isMapSaving"
          @update:tool="buildTool = $event"
          @close="toggleBuildMode"
        />
      </ClientOnly>
    </template>

    <!-- Invite modal -->
    <Teleport to="body">
      <div
        v-if="showInviteModal"
        class="fixed inset-0 z-[60] flex items-center justify-center"
        style="background: rgba(0, 0, 0, 0.55)"
        @click.self="closeInviteModal"
      >
        <div
          class="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
          style="
            background: rgba(12, 12, 18, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
          "
        >
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-sm" style="color: rgba(255, 255, 255, 0.85)">
              Invite people to {{ server?.name }}
            </h2>
            <button style="color: rgba(255, 255, 255, 0.3)" @click="closeInviteModal">✕</button>
          </div>

          <div v-if="inviteLoading" class="flex items-center justify-center py-4">
            <div
              class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
            />
          </div>

          <div v-else class="flex flex-col gap-2">
            <p class="text-xs" style="color: rgba(255, 255, 255, 0.3)">
              Share this link to invite people.
            </p>
            <div
              class="flex items-center gap-2 rounded-xl px-3 py-2"
              style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
              "
            >
              <span
                class="flex-1 truncate text-xs font-mono"
                style="color: rgba(255, 255, 255, 0.6)"
                >{{ inviteUrl }}</span
              >
              <button
                class="flex-shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                style="background: rgb(99, 102, 241); color: white"
                @click="copyInviteUrl"
              >
                {{ inviteCopied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <template v-if="channelMenu">
        <div
          class="fixed inset-0 z-[80]"
          @click="closeChannelMenu"
          @contextmenu.prevent="closeChannelMenu"
        />
        <div
          class="fixed z-[81] flex flex-col py-1 rounded-lg overflow-hidden min-w-[180px]"
          :style="{
            left: channelMenu.x + 'px',
            top: channelMenu.y + 'px',
            background: 'rgba(15, 15, 20, 0.95)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          }"
        >
          <div
            class="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider truncate"
            style="color: rgba(255, 255, 255, 0.35)"
          >
            {{ channelMenu.channel.name }}
          </div>
          <button
            class="flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06]"
            style="color: rgba(255, 255, 255, 0.85)"
            @click="toggleChannelPinFromMenu"
          >
            <component
              :is="isChannelPinnedToHome(channelMenu.channel.id) ? PinOff : Pin"
              :size="13"
              :stroke-width="1.75"
            />
            <span>{{
              isChannelPinnedToHome(channelMenu.channel.id)
                ? "Retirer de l'accueil"
                : "Épingler à l'accueil"
            }}</span>
          </button>
          <button
            v-if="canManageChannels"
            class="flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06]"
            style="color: rgba(255, 255, 255, 0.85)"
            @click="editChannelFromMenu"
          >
            <Settings :size="13" :stroke-width="1.75" />
            <span>Modifier</span>
          </button>
          <button
            v-if="canManageChannels"
            class="flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-red-500/10"
            style="color: rgb(248, 113, 113)"
            @click="deleteChannelFromMenu"
          >
            <Trash2 :size="13" :stroke-width="1.75" />
            <span>Supprimer</span>
          </button>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Layout shell: world fills viewport, cards float over it ── */
.page-root {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Shared glass-card look for floating panels */
.card {
  position: fixed;
  z-index: 30;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: rgba(12, 12, 18, 0.78);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.server-picker-row {
  transition: background 120ms;
}
.server-picker-row:hover {
  background: rgba(255, 255, 255, 0.05);
}
.server-picker-row--active {
  background: rgba(99, 102, 241, 0.1);
}

.dnd-ghost {
  opacity: 0.35;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 12px;
}

.dnd-fallback {
  opacity: 0.95 !important;
  cursor: grabbing !important;
  transform: scale(1.02);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}

.category-block:has(.dnd-ghost) {
  background: rgba(99, 102, 241, 0.12);
  box-shadow: inset 0 0 0 1px rgba(165, 180, 252, 0.5);
}
.category-block:has(.dnd-ghost) .cat-label {
  color: rgba(199, 210, 254, 0.95) !important;
}

.tile {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(12, 12, 18, 0.78);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.tile--voice {
  background: rgba(15, 15, 20, 0.78);
}

.rail-tile {
  width: 100%;
  height: 100%;
  background: rgba(12, 12, 18, 0.75);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.tile__header {
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: grab;
}
.tile__header:active {
  cursor: grabbing;
}

.tile__grip {
  position: absolute;
  inset: 0;
  cursor: grab;
  z-index: 0;
}
.tile__grip:active {
  cursor: grabbing;
}

.tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  overflow: hidden;
}
</style>
