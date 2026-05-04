<script setup lang="ts">
definePageMeta({ layout: 'app' });

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);

const { store, fetchServers } = useServers();
const { fetchChannels, updateChannel } = useChannels();
const { user, signOut } = useAuth();
const { createInvite } = useInvites();
const socket = useSocket();
const voice = useVoice();
const { isAdmin, loadMember } = useMember();
const {
  currentMap,
  buildMode,
  buildTool,
  isSaving: isMapSaving,
  loadMap,
  paintRect,
  paintWallsRect,
} = useMap();

// ── Multi-window chat ──
interface ChatWin {
  channelId: string;
  x: number;
  y: number;
}
const openWindows = ref<ChatWin[]>([]);
let windowCounter = 0;

function openChannel(channelId: string, e: MouseEvent) {
  const alreadyOpen = openWindows.value.find((w) => w.channelId === channelId);
  if (alreadyOpen) {
    focusWindow(channelId);
    return;
  }
  const stagger = (windowCounter % 6) * 28;
  const x = import.meta.client ? Math.round(window.innerWidth / 2 - 200) + stagger : 300;
  const y = import.meta.client ? Math.round(window.innerHeight / 2 - 270) + stagger : 100;
  windowCounter++;

  if (e.ctrlKey || e.metaKey) {
    openWindows.value = [...openWindows.value, { channelId, x, y }];
  } else {
    openWindows.value = [{ channelId, x, y }];
  }
}

function openChannelById(channelId: string) {
  openChannel(channelId, { ctrlKey: false, metaKey: false } as MouseEvent);
}

function closeWindow(channelId: string) {
  openWindows.value = openWindows.value.filter((w) => w.channelId !== channelId);
}

function focusWindow(channelId: string) {
  const win = openWindows.value.find((w) => w.channelId === channelId);
  if (!win) return;
  openWindows.value = [...openWindows.value.filter((w) => w.channelId !== channelId), win];
}

const activeChannelIds = computed(() => new Set(openWindows.value.map((w) => w.channelId)));

// ── Icon rail ──
const railExpanded = ref(false);
const forumPanelRight = computed(() => (railExpanded.value ? 212 : 76));

// ── Server picker ──
const showServerPicker = ref(false);
const serverPickerAnchor = ref<DOMRect | null>(null);

function openServerPicker(e: MouseEvent) {
  const btn = (e.currentTarget as HTMLElement).closest(
    '[data-server-header]',
  ) as HTMLElement | null;
  serverPickerAnchor.value = btn?.getBoundingClientRect() ?? null;
  showServerPicker.value = !showServerPicker.value;
}

function switchServer(id: string) {
  showServerPicker.value = false;
  navigateTo(`/app/${id}`);
}

const pickerTop = computed(() => {
  if (!serverPickerAnchor.value) return 64;
  return serverPickerAnchor.value.bottom + 8;
});

// ── Channel creation ──
const showCreateModal = ref(false);

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
      loadMember(id).catch((err) => console.warn('loadMember failed', err)),
      loadMap(id).catch((err) => console.warn('loadMap failed', err)),
    ]);
  },
  { immediate: true },
);

type RectPayload = { x1: number; y1: number; x2: number; y2: number; mode: 'add' | 'remove' };

function onTilesRect(rect: RectPayload) {
  if (!isAdmin.value || !buildMode.value) return;
  paintRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.mode);
}

function onWallsRect(rect: RectPayload) {
  if (!isAdmin.value || !buildMode.value) return;
  paintWallsRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.mode);
}

function toggleBuildMode() {
  buildMode.value = !buildMode.value;
}

async function handleVoiceChannelClick(channelId: string) {
  if (voice.currentChannelId.value === channelId) {
    await voice.leave();
  } else {
    await voice.join(serverId.value, channelId);
  }
}

let teardownVoiceListeners: (() => void) | null = null;

onMounted(() => {
  socket.connect();
  teardownVoiceListeners = voice.setupListeners();
});

onUnmounted(async () => {
  if (voice.currentChannelId.value) await voice.leave();
  teardownVoiceListeners?.();
  socket.disconnect();
});

async function handleSignOut() {
  await signOut();
  await navigateTo('/auth/login');
}
</script>

<template>
  <div class="relative h-full w-full overflow-hidden">
    <!-- World fills everything -->
    <ClientOnly>
      <WorldNookWorld
        v-if="user?.id"
        :server-id="serverId"
        :user-id="user.id"
        :player-name="user.name"
        :zone-picker-active="zonePickerActive"
        :map-data="currentMap"
        :build-mode="buildMode"
        :build-tool="buildTool"
        @zone-picked="onZonePicked"
        @zone-cancel="onZoneCancel"
        @tiles-rect="onTilesRect"
        @walls-rect="onWallsRect"
      />
    </ClientOnly>

    <!-- ── Icon rail ── -->
    <div
      class="fixed top-4 right-4 bottom-4 z-40 flex flex-col rounded-2xl py-2 gap-1 overflow-hidden"
      :style="{
        width: railExpanded ? '188px' : '52px',
        transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(12, 12, 18, 0.75)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }"
    >
      <!-- Server header — click to open server picker -->
      <button
        data-server-header
        class="flex items-center gap-2 flex-shrink-0 rounded-xl transition-all duration-150 outline-none"
        :class="railExpanded ? 'px-2 w-full py-0.5 hover:bg-white/5' : 'justify-center relative'"
        @click="openServerPicker"
      >
        <!-- Avatar -->
        <div
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white select-none relative"
          style="background: linear-gradient(135deg, #6366f1, #4338ca)"
        >
          {{ server?.name?.[0]?.toUpperCase() }}
          <!-- Collapsed chevron badge -->
          <span
            v-if="!railExpanded"
            class="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full"
            style="background: rgba(30, 30, 40, 0.95); border: 1px solid rgba(255, 255, 255, 0.1)"
          >
            <svg
              class="transition-transform duration-200"
              :class="{ 'rotate-180': showServerPicker }"
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="currentColor"
              style="color: rgba(255, 255, 255, 0.5)"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </span>
        </div>

        <!-- Expanded: name + chevron -->
        <template v-if="railExpanded">
          <span
            class="flex-1 truncate text-xs font-semibold text-left min-w-0"
            style="color: rgba(255, 255, 255, 0.7)"
          >
            {{ server?.name }}
          </span>
          <svg
            class="flex-shrink-0 transition-transform duration-200"
            :class="{ 'rotate-180': showServerPicker }"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            style="color: rgba(255, 255, 255, 0.3)"
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </template>
      </button>

      <!-- Divider -->
      <div
        class="mx-3 my-1 flex-shrink-0"
        style="height: 1px; background: rgba(255, 255, 255, 0.06)"
      />

      <!-- Text channels -->
      <div class="flex flex-col gap-0.5 px-1.5">
        <button
          v-for="ch in store.textChannels"
          :key="ch.id"
          class="relative flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          :style="
            activeChannelIds.has(ch.id)
              ? 'background: rgba(99,102,241,0.25); color: rgba(165,180,252,1)'
              : 'color: rgba(255,255,255,0.3)'
          "
          :title="railExpanded ? '' : ch.name + ' (Ctrl+click pour ouvrir plusieurs)'"
          @click="openChannel(ch.id, $event)"
        >
          <span
            v-if="activeChannelIds.has(ch.id)"
            class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-indigo-400"
          />
          <svg class="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
          <span v-if="railExpanded" class="truncate text-xs font-medium">{{ ch.name }}</span>
        </button>
      </div>

      <!-- Forum channels -->
      <div v-if="store.forumChannels.length" class="flex flex-col gap-0.5 px-1.5">
        <div class="mx-1 my-1" style="height: 1px; background: rgba(255, 255, 255, 0.04)" />
        <button
          v-for="ch in store.forumChannels"
          :key="ch.id"
          class="relative flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          :style="
            forumPanelChannelId === ch.id
              ? 'background: rgba(251,191,36,0.2); color: rgba(252,211,77,1)'
              : 'color: rgba(255,255,255,0.3)'
          "
          :title="railExpanded ? '' : ch.name"
          @click="openForumPanel(ch.id, ch.name, $event)"
        >
          <span
            v-if="forumPanelChannelId === ch.id"
            class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-yellow-400"
          />
          <svg class="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
          </svg>
          <span v-if="railExpanded" class="truncate text-xs font-medium">{{ ch.name }}</span>
        </button>
      </div>

      <!-- Voice channels -->
      <div v-if="store.voiceChannels.length" class="flex flex-col gap-0.5 px-1.5">
        <div class="mx-1 my-1" style="height: 1px; background: rgba(255, 255, 255, 0.04)" />
        <button
          v-for="ch in store.voiceChannels"
          :key="ch.id"
          class="relative flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          :style="
            voice.currentChannelId.value === ch.id
              ? 'background: rgba(34,197,94,0.15); color: #4ade80'
              : 'color: rgba(255,255,255,0.3)'
          "
          :title="railExpanded ? '' : ch.name"
          @click="handleVoiceChannelClick(ch.id)"
        >
          <span
            v-if="voice.currentChannelId.value === ch.id"
            class="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-green-400"
          />
          <div class="relative flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
              />
            </svg>
            <span
              v-if="voice.voicePresence.value.get(ch.id)?.length"
              class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
              style="border: 1.5px solid rgba(12, 12, 18, 0.9)"
            />
          </div>
          <span v-if="railExpanded" class="truncate text-xs font-medium">{{ ch.name }}</span>
        </button>
      </div>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Bottom actions -->
      <div class="flex flex-col gap-0.5 px-1.5">
        <div class="mx-1 mb-1" style="height: 1px; background: rgba(255, 255, 255, 0.04)" />

        <!-- Build mode (admin-only) -->
        <button
          v-if="isAdmin"
          class="relative flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          :style="
            buildMode
              ? 'background: rgba(99,102,241,0.25); color: rgba(165,180,252,1)'
              : 'color: rgba(255,255,255,0.3)'
          "
          :title="buildMode ? 'Quitter le mode build' : 'Mode build'"
          @click="toggleBuildMode"
        >
          <svg class="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22 9l-3.39-.34-1.46-3.15-2.91 1.81L11 6l-1.24 3.32-2.91-1.81L5.39 10.66 2 11l1.81 2.91L2 16.83l3.39.34 1.46 3.15 2.91-1.81L11 22l1.24-3.32 2.91 1.81 1.46-3.15L22 17l-1.81-2.91z"
            />
          </svg>
          <span v-if="railExpanded" class="truncate text-xs font-medium">
            {{ buildMode ? 'Mode build (on)' : 'Mode build' }}
          </span>
          <span
            v-if="isMapSaving"
            class="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400"
            title="Sauvegarde…"
          />
        </button>

        <!-- Create channel -->
        <button
          class="relative flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          style="color: rgba(255, 255, 255, 0.25)"
          title="Créer un canal"
          @click="showCreateModal = true"
        >
          <svg class="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <span v-if="railExpanded" class="truncate text-xs font-medium">Nouveau canal</span>
        </button>

        <NuxtLink
          :to="`/app/${serverId}/plugins`"
          class="flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          :style="
            route.path.endsWith('/plugins')
              ? 'background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8)'
              : 'color: rgba(255,255,255,0.3)'
          "
          title="Plugins"
        >
          <svg class="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"
            />
          </svg>
          <span v-if="railExpanded" class="truncate text-xs font-medium">Plugins</span>
        </NuxtLink>

        <!-- Invite -->
        <button
          class="flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          style="color: rgba(255, 255, 255, 0.3)"
          title="Inviter des gens"
          @click="handleInvite"
        >
          <svg class="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
          <span v-if="railExpanded" class="truncate text-xs font-medium">Inviter</span>
        </button>

        <!-- Sign out -->
        <button
          class="flex h-8 items-center gap-2 rounded-xl transition-all duration-150"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          style="color: rgba(255, 255, 255, 0.2)"
          title="Se déconnecter"
          @click="handleSignOut"
        >
          <svg class="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
            />
          </svg>
          <span v-if="railExpanded" class="truncate text-xs font-medium">Déconnexion</span>
        </button>

        <!-- Expand / collapse toggle -->
        <button
          class="flex h-8 items-center gap-2 rounded-xl transition-all duration-150 mt-1"
          :class="railExpanded ? 'px-2 justify-start' : 'justify-center'"
          style="color: rgba(255, 255, 255, 0.2)"
          :title="railExpanded ? 'Réduire' : 'Déplier'"
          @click="railExpanded = !railExpanded"
        >
          <svg
            class="flex-shrink-0 transition-transform duration-200"
            :style="railExpanded ? 'transform: rotate(180deg)' : ''"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Server picker dropdown ── -->
    <Teleport to="body">
      <div v-if="showServerPicker" class="fixed inset-0 z-[55]" @click="showServerPicker = false" />
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
        <p
          class="px-3 py-1.5 text-xs font-medium uppercase tracking-wider"
          style="color: rgba(255, 255, 255, 0.2)"
        >
          Mes Nooks
        </p>
        <button
          v-for="s in store.list"
          :key="s.id"
          class="flex items-center gap-3 px-3 py-2 text-left transition-colors server-picker-row"
          :class="{ 'server-picker-row--active': s.id === serverId }"
          @click="switchServer(s.id)"
        >
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style="background: linear-gradient(135deg, #6366f1, #4338ca)"
          >
            {{ s.name[0]?.toUpperCase() }}
          </div>
          <span class="truncate text-xs font-medium" style="color: rgba(255, 255, 255, 0.7)">{{
            s.name
          }}</span>
          <svg
            v-if="s.id === serverId"
            class="ml-auto flex-shrink-0"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            style="color: rgba(99, 102, 241, 0.8)"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
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
      :right-offset="forumPanelRight"
      @close="forumPanelChannelId = null"
      @open-post="openChannelById"
    />

    <!-- ── Create channel modal ── -->
    <ChannelCreateChannelModal
      v-if="showCreateModal"
      :server-id="serverId"
      @close="showCreateModal = false"
      @created="onChannelCreated"
    />

    <!-- ── Chat windows ── -->
    <ChatWindow
      v-for="(win, i) in openWindows"
      :key="win.channelId"
      :channel-id="win.channelId"
      :initial-x="win.x"
      :initial-y="win.y"
      :z-index="45 + i"
      @close="closeWindow(win.channelId)"
      @focus="focusWindow(win.channelId)"
    />

    <!-- Voice panel -->
    <ClientOnly>
      <VoicePanel />
    </ClientOnly>

    <!-- Build panel (admin + build mode only) -->
    <ClientOnly>
      <WorldBuildPanel
        v-if="isAdmin && buildMode"
        :tool="buildTool"
        :is-saving="isMapSaving"
        @update:tool="buildTool = $event"
        @close="toggleBuildMode"
      />
    </ClientOnly>

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
  </div>
</template>

<style scoped>
.server-picker-row {
  transition: background 120ms;
}
.server-picker-row:hover {
  background: rgba(255, 255, 255, 0.05);
}
.server-picker-row--active {
  background: rgba(99, 102, 241, 0.1);
}
</style>
